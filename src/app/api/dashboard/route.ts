import { NextRequest, NextResponse } from "next/server";
import { DashboardData, Agent, PR, ActivityEvent } from "@/types/dashboard";
import * as apiCache from "@/lib/apiCache";
import { accessSync, constants } from "fs";
import { readFile } from "fs/promises";
import { execFileAsync } from "@/lib/execFileAsync";
import {
  parseTmuxList,
  computeUptime,
  determineStatus,
  extractBranch,
} from "@/lib/sessionHelpers";
import type { TmuxSession } from "@/types/sessions";

const FETCH_TIMEOUT_MS = 5000;
const TMUX_BIN = "/usr/bin/tmux";
const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DEFAULT_REPO =
  process.env.FLEET_REPOS?.split(",")[0]?.trim() ||
  "sergi-izquierdo/fleet-dashboard";

const ALL_REPOS = (
  process.env.FLEET_REPOS || "sergi-izquierdo/fleet-dashboard"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

/** Map TmuxSession status to Agent status */
function sessionStatusToAgentStatus(
  status: TmuxSession["status"],
): Agent["status"] {
  switch (status) {
    case "working":
      return "working";
    case "stuck":
      return "error";
    case "idle":
    default:
      return "working";
  }
}

/** Convert a TmuxSession to a minimal Agent object */
function sessionToAgent(session: TmuxSession): Agent {
  return {
    name: session.name,
    sessionId: session.name,
    status: sessionStatusToAgentStatus(session.status),
    issue: {
      title: session.branch !== "unknown" ? session.branch : "Active session",
      number: 0,
      url: "",
    },
    branch: session.branch,
    timeElapsed: session.uptime,
  };
}

/** Fetch real tmux sessions and convert to Agent[] */
async function fetchRealAgents(): Promise<Agent[]> {
  try {
    accessSync(TMUX_BIN, constants.X_OK);
  } catch {
    return [];
  }

  try {
    const { stdout: tmuxListOutput } = await execFileAsync(TMUX_BIN, ["ls"]);
    const rawSessions = parseTmuxList(tmuxListOutput);

    const sessions: TmuxSession[] = await Promise.all(
      rawSessions.map(async ({ name, created }) => {
        let paneOutput = "";
        try {
          const result = await execFileAsync(TMUX_BIN, [
            "capture-pane",
            "-t",
            name,
            "-p",
            "-l",
            "50",
          ]);
          paneOutput = result.stdout;
        } catch {
          // ignore capture failures
        }
        return {
          name,
          status: determineStatus(paneOutput),
          uptime: computeUptime(created),
          branch: extractBranch(paneOutput),
          taskName: "unknown",
        };
      }),
    );

    return sessions.map(sessionToAgent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("no server running") ||
      message.includes("no sessions")
    ) {
      return [];
    }
    return [];
  }
}

/** Fetch real PRs from GitHub and convert to dashboard PR[] */
async function fetchRealPRs(repo: string): Promise<PR[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const url = `https://api.github.com/repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=10`;
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const pulls = await response.json();
    const prs: PR[] = [];

    for (const pr of pulls) {
      let ciStatus: PR["ciStatus"] = "pending";

      if (pr.head?.sha) {
        try {
          const checksController = new AbortController();
          const checksTimeout = setTimeout(
            () => checksController.abort(),
            3000,
          );
          const checksUrl = `https://api.github.com/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=1`;
          const checksResp = await fetch(checksUrl, {
            headers,
            signal: checksController.signal,
          });
          clearTimeout(checksTimeout);

          if (checksResp.ok) {
            const checksData = await checksResp.json();
            if (checksData.total_count > 0) {
              const run = checksData.check_runs[0];
              if (run.conclusion === "success") ciStatus = "passing";
              else if (run.conclusion === "failure") ciStatus = "failing";
              else if (
                run.status === "in_progress" ||
                run.status === "queued"
              )
                ciStatus = "pending";
            }
          }
        } catch {
          // CI status stays pending
        }
      }

      const mergeState: PR["mergeState"] = pr.merged_at
        ? "merged"
        : pr.state === "closed"
          ? "closed"
          : "open";

      prs.push({
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        ciStatus,
        reviewStatus: "pending",
        mergeState,
        author: pr.user?.login ?? "unknown",
        branch: pr.head?.ref ?? "unknown",
      });
    }

    return prs;
  } catch {
    return [];
  }
}

interface CompletedAgentEntry {
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
}

const STATUS_EVENT_MAP: Record<string, ActivityEvent["eventType"]> = {
  pr_created: "pr_created",
  pr_merged: "deploy",
  pr_exists: "pr_created",
  timeout: "error",
  recovered: "review",
  completed: "ci_passed",
};

function completedAgentToEvent(
  key: string,
  agent: CompletedAgentEntry,
): ActivityEvent {
  const eventType = STATUS_EVENT_MAP[agent.status] ?? "commit";
  const prefix =
    agent.status === "pr_created"
      ? "PR created"
      : agent.status === "pr_merged"
        ? "PR merged"
        : agent.status === "timeout"
          ? "Agent timed out"
          : agent.status === "recovered"
            ? "Agent recovered"
            : agent.status === "pr_exists"
              ? "PR already exists"
              : agent.status === "completed"
                ? "Completed"
                : agent.status;

  return {
    id: `${key}-${agent.completedAt}`,
    timestamp: agent.completedAt,
    agentName: key,
    eventType,
    description: `${prefix}: ${agent.title}`,
    project: agent.repo,
  };
}

/** Read state.json + optional archive to produce activity events */
async function fetchActivityLog(): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const state = JSON.parse(raw) as {
      completed: Record<string, CompletedAgentEntry>;
    };
    for (const [key, agent] of Object.entries(state.completed ?? {})) {
      events.push(completedAgentToEvent(key, agent));
    }
  } catch {
    // state.json missing or unreadable
  }

  const archivePath = STATE_PATH.replace("state.json", "state-archive.jsonl");
  try {
    const raw = await readFile(archivePath, "utf-8");
    for (const line of raw.trim().split("\n").filter(Boolean)) {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const key = String(parsed._key ?? "unknown");
      const entry: CompletedAgentEntry = {
        repo: String(parsed.repo ?? ""),
        issue: Number(parsed.issue ?? 0),
        title: String(parsed.title ?? ""),
        pr: String(parsed.pr ?? ""),
        status: String(parsed.status ?? ""),
        completedAt: String(parsed._archivedAt ?? parsed.completedAt ?? ""),
      };
      events.push(completedAgentToEvent(key, entry));
    }
  } catch {
    // archive missing
  }

  events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return events.slice(0, 100);
}

const CACHE_KEY_PREFIX = "api:dashboard";
const CACHE_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";
  const repoParam = request.nextUrl.searchParams.get("repo")?.trim() || "";
  const targetRepo = repoParam && ALL_REPOS.includes(repoParam) ? repoParam : "";
  const cacheKey = targetRepo
    ? `${CACHE_KEY_PREFIX}:${targetRepo}`
    : CACHE_KEY_PREFIX;

  if (!fresh) {
    const cached = apiCache.get<DashboardData>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=15" },
      });
    }
  }

  const prRepo = targetRepo || DEFAULT_REPO;
  const [agents, prs, activityLog] = await Promise.all([
    fetchRealAgents(),
    fetchRealPRs(prRepo),
    fetchActivityLog(),
  ]);

  const data: DashboardData = {
    agents,
    prs,
    activityLog,
  };

  apiCache.set(cacheKey, data, CACHE_TTL_MS);
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=15" },
  });
}
