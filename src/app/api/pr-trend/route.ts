import { NextRequest, NextResponse } from "next/server";
import * as apiCache from "@/lib/apiCache";

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

const FETCH_TIMEOUT_MS = 8000;
const DAYS = 14;

export interface PRTrendEntry {
  date: string;
  [repo: string]: number | string;
}

export interface PRTrendResponse {
  data: PRTrendEntry[];
  repos: string[];
}

interface GitHubPR {
  merged_at: string | null;
}

async function fetchMergedPRsForRepo(repo: string): Promise<{ date: string }[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const since = new Date();
  since.setDate(since.getDate() - DAYS);
  const sinceIso = since.toISOString();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const pulls: GitHubPR[] = await response.json();

    return pulls
      .filter((pr) => pr.merged_at !== null && pr.merged_at >= sinceIso)
      .map((pr) => ({ date: pr.merged_at!.slice(0, 10) }));
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

function buildDateRange(): string[] {
  const dates: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function shortRepoName(repo: string): string {
  return repo.split("/")[1] ?? repo;
}

async function fetchPRTrend(): Promise<PRTrendResponse> {
  const dates = buildDateRange();
  const repoNames = REPOS.map(shortRepoName);

  // Initialize data with all dates and zeros for each repo
  const dataMap = new Map<string, PRTrendEntry>();
  for (const date of dates) {
    const entry: PRTrendEntry = { date };
    for (const name of repoNames) {
      entry[name] = 0;
    }
    dataMap.set(date, entry);
  }

  // Fetch merged PRs for each repo in parallel
  const results = await Promise.allSettled(
    REPOS.map((repo) => fetchMergedPRsForRepo(repo))
  );

  for (let i = 0; i < REPOS.length; i++) {
    const result = results[i];
    const repoName = repoNames[i];
    if (result.status === "fulfilled") {
      for (const { date } of result.value) {
        const entry = dataMap.get(date);
        if (entry) {
          entry[repoName] = (entry[repoName] as number) + 1;
        }
      }
    }
  }

  return {
    data: dates.map((d) => dataMap.get(d)!),
    repos: repoNames,
  };
}

const CACHE_KEY = "api:pr-trend";
const CACHE_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<PRTrendResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
      });
    }
  }

  try {
    const trend = await fetchPRTrend();
    apiCache.set(CACHE_KEY, trend, CACHE_TTL_MS);
    return NextResponse.json(trend, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error(
      "Failed to fetch PR trend:",
      error instanceof Error ? error.message : error
    );
    const empty: PRTrendResponse = { data: [], repos: [] };
    return NextResponse.json(empty, { status: 200 });
  }
}
