import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import {
  calculateHealthScore,
  type RepoHealthData,
} from "@/lib/repoHealth";
import type { StateJson, CompletedAgent } from "@/lib/fleetHealth";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = "api:repos-health";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

const MANAGED_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
  "sergi-izquierdo/pavello-larapita-app",
];

const REPOS = (process.env.FLEET_REPOS || MANAGED_REPOS.join(","))
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const STATE_PATH =
  process.env.FLEET_STATE_PATH || "/home/sergi/agent-fleet/orchestrator/state.json";

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

interface GitHubRepoMeta {
  open_issues_count: number;
}

interface GitHubPR {
  created_at: string;
  merged_at: string | null;
}

async function fetchRepoMeta(repo: string, headers: Record<string, string>): Promise<number> {
  const res = await fetchWithTimeout(`https://api.github.com/repos/${repo}`, headers);
  if (!res.ok) return 0;
  const data = (await res.json()) as GitHubRepoMeta;
  return data.open_issues_count ?? 0;
}

async function fetchMergedPRStats(
  repo: string,
  headers: Record<string, string>
): Promise<{ prsMerged7d: number; avgMergeTimeMinutes: number | null }> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=30`;
  const res = await fetchWithTimeout(url, headers);
  if (!res.ok) return { prsMerged7d: 0, avgMergeTimeMinutes: null };

  const pulls = (await res.json()) as GitHubPR[];
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let prsMerged7d = 0;
  const mergeTimes: number[] = [];

  for (const pr of pulls) {
    if (!pr.merged_at) continue;
    const mergedAt = new Date(pr.merged_at);
    if (mergedAt >= cutoff) prsMerged7d++;
    if (mergeTimes.length < 10) {
      const createdAt = new Date(pr.created_at);
      const diffMs = mergedAt.getTime() - createdAt.getTime();
      if (diffMs > 0) mergeTimes.push(diffMs / 60_000);
    }
  }

  const avgMergeTimeMinutes =
    mergeTimes.length > 0
      ? Math.round(mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length)
      : null;

  return { prsMerged7d, avgMergeTimeMinutes };
}

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

function getFailedAgentsByRepo(state: StateJson): Record<string, number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const counts: Record<string, number> = {};

  for (const agent of Object.values(state.completed) as CompletedAgent[]) {
    if (!agent.completedAt) continue;
    if (new Date(agent.completedAt) < cutoff) continue;
    if (agent.status !== "failed" && agent.status !== "timeout") continue;
    counts[agent.repo] = (counts[agent.repo] ?? 0) + 1;
  }

  return counts;
}

async function buildRepoHealthData(): Promise<RepoHealthData[]> {
  const headers = getGitHubHeaders();
  const state = await readStateJson();
  const failedByRepo = getFailedAgentsByRepo(state);

  const results = await Promise.all(
    REPOS.map(async (repo) => {
      try {
        const [openIssues, { prsMerged7d, avgMergeTimeMinutes }] = await Promise.all([
          fetchRepoMeta(repo, headers),
          fetchMergedPRStats(repo, headers),
        ]);
        const failedAgents7d = failedByRepo[repo] ?? 0;
        const healthScore = calculateHealthScore({
          openIssues,
          prsMerged7d,
          failedAgents7d,
          avgMergeTimeMinutes,
        });
        return { repo, openIssues, prsMerged7d, failedAgents7d, avgMergeTimeMinutes, healthScore };
      } catch {
        return {
          repo,
          openIssues: 0,
          prsMerged7d: 0,
          failedAgents7d: failedByRepo[repo] ?? 0,
          avgMergeTimeMinutes: null,
          healthScore: calculateHealthScore({
            openIssues: 0,
            prsMerged7d: 0,
            failedAgents7d: failedByRepo[repo] ?? 0,
            avgMergeTimeMinutes: null,
          }),
        };
      }
    })
  );

  return results;
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<RepoHealthData[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=60" },
      });
    }
  }

  try {
    const data = await buildRepoHealthData();
    apiCache.set(CACHE_KEY, data, CACHE_TTL_MS);
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=60" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch repo health: ${message}` },
      { status: 500 }
    );
  }
}
