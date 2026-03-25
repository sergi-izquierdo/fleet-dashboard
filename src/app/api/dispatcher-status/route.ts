import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import * as apiCache from "@/lib/apiCache";

const STATUS_PATH =
  process.env.DISPATCHER_STATUS_PATH ||
  "/home/sergi/agent-fleet/orchestrator/dispatcher-status.json";

const CACHE_KEY = "api:dispatcher-status";
const CACHE_TTL_MS = 10_000;

export interface PhaseStatus {
  status: "completed" | "failed" | "skipped" | "running";
  durationMs?: number;
  summary?: string;
  skipReason?: string;
}

export interface CycleStatus {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  nextRunAt: string;
  consecutiveErrors: number;
  errors: number;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  level: "ok" | "warning" | "critical";
  resetAt: string;
}

export interface PRPipelineEntry {
  repo: string;
  pr: number;
  stage: "conflicting" | "fixing" | "ci_failing" | "eligible" | "blocked";
  fixAttempt?: number;
  maxAttempts?: number;
  fixAgent?: string;
  blockReason?: string;
  title?: string;
}

export interface DispatcherStatusResponse {
  cycle: CycleStatus | null;
  rateLimit: RateLimitStatus | null;
  phases: Record<string, PhaseStatus>;
  prPipeline: PRPipelineEntry[];
  activeAgents: number;
  completedAgents: number;
  isStale: boolean;
  timestamp: string;
}

async function readStatusJson(): Promise<DispatcherStatusResponse> {
  const raw = await readFile(STATUS_PATH, "utf-8");
  const json = JSON.parse(raw) as {
    cycle?: CycleStatus;
    rateLimit?: RateLimitStatus;
    phases?: Record<string, PhaseStatus>;
    prPipeline?: PRPipelineEntry[];
    activeAgents?: number;
    completedAgents?: number;
  };

  const cycle = json.cycle ?? null;
  const isStale = cycle
    ? Date.now() - new Date(cycle.finishedAt).getTime() > 3 * 60 * 1000
    : true;

  return {
    cycle,
    rateLimit: json.rateLimit ?? null,
    phases: json.phases ?? {},
    prPipeline: json.prPipeline ?? [],
    activeAgents: json.activeAgents ?? 0,
    completedAgents: json.completedAgents ?? 0,
    isStale,
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  const cached = apiCache.get<DispatcherStatusResponse>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=5" },
    });
  }

  try {
    const data = await readStatusJson();
    apiCache.set(CACHE_KEY, data, CACHE_TTL_MS);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=5" },
    });
  } catch {
    return NextResponse.json(
      { error: "Dispatcher status unavailable" },
      { status: 404 },
    );
  }
}
