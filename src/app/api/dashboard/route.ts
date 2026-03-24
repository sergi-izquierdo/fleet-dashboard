import { NextRequest, NextResponse } from "next/server";
import { DashboardData, Agent, PR, ActivityEvent } from "@/types/dashboard";
import { getCachedOrFetch } from "@/lib/apiCache";
import { accessSync, constants } from "fs";
import { execFileAsync } from "@/lib/execFileAsync";
import {
  parseTmuxList,
  computeUptime,
  determineStatus,
  extractBranch,
} from "@/lib/sessionHelpers";
import type { TmuxSession } from "@/types/sessions";

const AO_API_URL = process.env.AO_API_URL || "http://localhost:3000";
const FETCH_TIMEOUT_MS = 5000;
const TMUX_BIN = "/usr/bin/tmux";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO =
  process.env.FLEET_REPOS?.split(",")[0]?.trim() ||
  "sergi-izquierdo/fleet-dashboard";

function transformAgent(raw: Record<string, unknown>): Agent {
  return {
    name: String(raw.name ?? ""),
    sessionId: String(raw.sessionId ?? ""),
    status: raw.status as Agent["status"],
    issue: {
      title: String((raw.issue as Record<string, unknown>)?.title ?? ""),
      number: Number((raw.issue as Record<string, unknown>)?.number ?? 0),
      url: String((raw.issue as Record<string, unknown>)?.url ?? ""),
    },
    branch: String(raw.branch ?? ""),
    timeElapsed: String(raw.timeElapsed ?? ""),
    ...(raw.pr
      ? {
          pr: {
            url: String((raw.pr as Record<string, unknown>)?.url ?? ""),
            number: Number(
              (raw.pr as Record<string, unknown>)?.number ?? 0,
            ),
          },
        }
      : {}),
  };
}

function transformPR(raw: Record<string, unknown>): PR {
  return {
    number: Number(raw.number ?? 0),
    url: String(raw.url ?? ""),
    title: String(raw.title ?? ""),
    ciStatus: raw.ciStatus as PR["ciStatus"],
    reviewStatus: raw.reviewStatus as PR["reviewStatus"],
    mergeState: raw.mergeState as PR["mergeState"],
    author: String(raw.author ?? ""),
    branch: String(raw.branch ?? ""),
  };
}

function transformActivityEvent(raw: Record<string, unknown>): ActivityEvent {
  return {
    id: String(raw.id ?? ""),
    timestamp: String(raw.timestamp ?? ""),
    agentName: String(raw.agentName ?? ""),
    eventType: raw.eventType as ActivityEvent["eventType"],
    description: String(raw.description ?? ""),
  };
}

function transformAOResponse(data: Record<string, unknown>): DashboardData {
  const agents = Array.isArray(data.agents)
    ? data.agents.map(transformAgent)
    : [];
  const prs = Array.isArray(data.prs) ? data.prs.map(transformPR) : [];
  const activityLog = Array.isArray(data.activityLog)
    ? data.activityLog.map(transformActivityEvent)
    : [];

  return { agents, prs, activityLog };
}

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
async function fetchRealPRs(): Promise<PR[]> {
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

    const url = `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=all&sort=created&direction=desc&per_page=10`;
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
          const checksUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits/${pr.head.sha}/check-runs?per_page=1`;
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

const CACHE_TTL_SECONDS = 30;

async function fetchDashboardData(): Promise<DashboardData> {
  // First try the AO (Agent Orchestrator) API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(`${AO_API_URL}/api/ao/dashboard`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AO API responded with status ${response.status}`);
    }

    const raw = await response.json();
    return transformAOResponse(raw);
  } catch {
    // AO API unavailable — build dashboard from real sources
    const [agents, prs] = await Promise.all([
      fetchRealAgents(),
      fetchRealPRs(),
    ]);

    return { agents, prs, activityLog: [] };
  }
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";
  const { data, fromCache } = await getCachedOrFetch(
    "api:dashboard",
    CACHE_TTL_SECONDS,
    fetchDashboardData,
    fresh,
  );

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": `s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate`,
      "X-Cache": fromCache ? "HIT" : "MISS",
    },
  });
}
