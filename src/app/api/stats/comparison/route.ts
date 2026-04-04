import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const ARCHIVE_PATH = STATE_PATH.replace("state.json", "state-archive.jsonl");

const CACHE_KEY_PREFIX = "api:stats-comparison";
const CACHE_TTL_MS = 120_000; // 2 min

export interface PeriodStats {
  merged: number;
  failed: number;
  timeout: number;
  sessions: number;
}

export interface StatDelta {
  delta: number;
  pct: number | null; // null when previous is 0 (no prior data)
}

export interface StatsComparisonResponse {
  current: PeriodStats;
  previous: PeriodStats;
  deltas: {
    merged: StatDelta;
    failed: StatDelta;
    timeout: StatDelta;
    sessions: StatDelta;
  };
  period: "7d" | "24h";
}

interface ArchiveEntry {
  status: string;
  _archivedAt?: string;
  completedAt?: string;
}

function parsePeriodMs(period: "7d" | "24h"): number {
  return period === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
}

async function readArchive(): Promise<ArchiveEntry[]> {
  try {
    const raw = await readFile(ARCHIVE_PATH, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      return {
        status: String(parsed.status ?? ""),
        _archivedAt: parsed._archivedAt ? String(parsed._archivedAt) : undefined,
        completedAt: parsed.completedAt ? String(parsed.completedAt) : undefined,
      };
    });
  } catch {
    return [];
  }
}

function computeStats(entries: ArchiveEntry[], from: number, to: number): PeriodStats {
  let merged = 0;
  let failed = 0;
  let timeout = 0;
  let sessions = 0;

  for (const entry of entries) {
    const ts = entry._archivedAt ?? entry.completedAt;
    if (!ts) continue;
    const ms = new Date(ts).getTime();
    if (isNaN(ms) || ms < from || ms >= to) continue;

    sessions++;
    if (entry.status === "pr_merged") merged++;
    if (entry.status === "timeout") {
      timeout++;
      failed++;
    } else if (entry.status === "failed") {
      failed++;
    }
  }

  return { merged, failed, timeout, sessions };
}

function computeDelta(current: number, previous: number): StatDelta {
  const delta = current - previous;
  const pct = previous === 0 ? null : Math.round((delta / previous) * 100);
  return { delta, pct };
}

function buildComparison(
  entries: ArchiveEntry[],
  period: "7d" | "24h",
): StatsComparisonResponse {
  const periodMs = parsePeriodMs(period);
  const now = Date.now();

  const currentFrom = now - periodMs;
  const currentTo = now;
  const previousFrom = now - 2 * periodMs;
  const previousTo = now - periodMs;

  const current = computeStats(entries, currentFrom, currentTo);
  const previous = computeStats(entries, previousFrom, previousTo);

  return {
    current,
    previous,
    deltas: {
      merged: computeDelta(current.merged, previous.merged),
      failed: computeDelta(current.failed, previous.failed),
      timeout: computeDelta(current.timeout, previous.timeout),
      sessions: computeDelta(current.sessions, previous.sessions),
    },
    period,
  };
}

export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period");
  const period: "7d" | "24h" = periodParam === "24h" ? "24h" : "7d";
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";
  const cacheKey = `${CACHE_KEY_PREFIX}:${period}`;

  if (!fresh) {
    const cached = apiCache.get<StatsComparisonResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
      });
    }
  }

  try {
    const entries = await readArchive();
    const result = buildComparison(entries, period);

    apiCache.set(cacheKey, result, CACHE_TTL_MS);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch comparison stats: ${message}` },
      { status: 500 },
    );
  }
}
