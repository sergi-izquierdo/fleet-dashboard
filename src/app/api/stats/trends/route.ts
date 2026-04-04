import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DEFAULT_REPOS = [
  "sergi-izquierdo/fleet-dashboard",
  "sergi-izquierdo/pavello-larapita-app",
  "sergi-izquierdo/synapse-notes",
  "sergi-izquierdo/autotask-engine",
];
const REPOS = (process.env.FLEET_REPOS || DEFAULT_REPOS.join(","))
  .split(",")
  .map((r) => r.trim());

const CACHE_KEY = "api:stats-trends";
const CACHE_TTL_MS = 300_000; // 5 min
const FETCH_TIMEOUT_MS = 8000;

export interface StatsTrendsResponse {
  agents24h: number[];
  prsMerged7d: number[];
  issuesCompleted7d: number[];
}

interface CompletedAgent {
  completedAt: string;
  startedAt?: string;
}

interface StateJson {
  active: Record<string, Record<string, unknown>>;
  completed: Record<string, CompletedAgent>;
}

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

function buildAgents24h(state: StateJson): number[] {
  const now = Date.now();
  const hours = Array<number>(24).fill(0);

  // Count active agents per hour bucket over last 24h using completed agents
  const allEntries = Object.values(state.completed);
  for (const agent of allEntries) {
    if (!agent.completedAt) continue;
    const completedMs = new Date(agent.completedAt).getTime();
    const ageMs = now - completedMs;
    if (ageMs < 0 || ageMs >= 24 * 60 * 60 * 1000) continue;
    const hourIndex = Math.floor(ageMs / (60 * 60 * 1000));
    // hourIndex 0 = most recent hour, 23 = oldest
    hours[23 - hourIndex] += 1;
  }

  return hours;
}

function buildIssuesCompleted7d(state: StateJson): number[] {
  const days = Array<number>(7).fill(0);
  const now = new Date();

  const allEntries = Object.values(state.completed);
  for (const agent of allEntries) {
    if (!agent.completedAt) continue;
    const completedDate = new Date(agent.completedAt);
    const diffMs = now.getTime() - completedDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays < 0 || diffDays >= 7) continue;
    // diffDays 0 = today, 6 = 6 days ago; index 0 = oldest
    days[6 - diffDays] += 1;
  }

  return days;
}

async function fetchPrsMerged7d(): Promise<number[]> {
  const days = Array<number>(7).fill(0);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  for (const repo of REPOS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const pulls = await response.json();
      for (const pr of pulls) {
        if (!pr.merged_at) continue;
        const mergedAt = new Date(pr.merged_at as string);
        if (mergedAt < cutoff) continue;
        const diffMs = now.getTime() - mergedAt.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < 7) {
          days[6 - diffDays] += 1;
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  }

  return days;
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<StatsTrendsResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
      });
    }
  }

  try {
    const [state, prsMerged7d] = await Promise.all([
      readStateJson(),
      fetchPrsMerged7d(),
    ]);

    const result: StatsTrendsResponse = {
      agents24h: buildAgents24h(state),
      prsMerged7d,
      issuesCompleted7d: buildIssuesCompleted7d(state),
    };

    apiCache.set(CACHE_KEY, result, CACHE_TTL_MS);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch trends: ${message}` },
      { status: 500 },
    );
  }
}
