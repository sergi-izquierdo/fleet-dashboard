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

export interface PRTrendDay {
  date: string; // YYYY-MM-DD
  count: number;
}

function buildDateRange(): PRTrendDay[] {
  const days: PRTrendDay[] = [];
  const now = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return days;
}

async function fetchMergedPRTrends(): Promise<PRTrendDay[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const countsByDate = new Map<string, number>();

  for (const repo of REPOS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Fetch merged PRs for this repo, sorted by updated desc
      const url = `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      const pulls = await response.json();

      for (const pr of pulls) {
        if (!pr.merged_at) continue;
        const mergedAt = new Date(pr.merged_at);
        if (mergedAt < cutoff) continue;
        const dateKey = mergedAt.toISOString().slice(0, 10);
        countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
      }
    } catch {
      clearTimeout(timeoutId);
      // If one repo fails, continue with others
    }
  }

  const days = buildDateRange();
  for (const day of days) {
    day.count = countsByDate.get(day.date) ?? 0;
  }

  return days;
}

const CACHE_KEY = "api:pr-trends";
const CACHE_TTL_MS = 600_000;

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<PRTrendDay[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
      });
    }
  }

  try {
    const trends = await fetchMergedPRTrends();
    apiCache.set(CACHE_KEY, trends, CACHE_TTL_MS);
    return NextResponse.json(trends, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error(
      "Failed to fetch PR trends:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(buildDateRange(), { status: 200 });
  }
}
