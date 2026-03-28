import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import type { DispatcherStatus } from "@/types/dispatcherStatus";

const STATUS_PATH =
  process.env.DISPATCHER_STATUS_PATH ||
  "/home/sergi/agent-fleet/orchestrator/dispatcher-status.json";

const CACHE_KEY = "api:dispatcher-status";
const CACHE_TTL_MS = 20_000;
const OFFLINE_THRESHOLD_S = 180;

export async function GET() {
  const cached = apiCache.get<DispatcherStatus>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  try {
    const raw = await readFile(STATUS_PATH, "utf-8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData: any = JSON.parse(raw);

    const finishedAt = rawData.cycle?.finishedAt
      ? new Date(rawData.cycle.finishedAt).getTime()
      : 0;
    const ageSeconds = (Date.now() - finishedAt) / 1000;
    const offline = ageSeconds > OFFLINE_THRESHOLD_S;

    // Normalize fields: dispatcher writes numbers but dashboard expects arrays
    const activeAgents: string[] = Array.isArray(rawData.activeAgents)
      ? rawData.activeAgents
      : typeof rawData.activeAgents === "object" && rawData.activeAgents !== null
        ? Object.keys(rawData.activeAgents)
        : [];
    const completedAgents: string[] = Array.isArray(rawData.completedAgents)
      ? rawData.completedAgents
      : typeof rawData.completedAgents === "object" && rawData.completedAgents !== null
        ? Object.keys(rawData.completedAgents)
        : [];

    // errors may be a number (count) instead of string[]
    const cycleErrors: string[] = Array.isArray(rawData.cycle?.errors)
      ? rawData.cycle.errors
      : [];
    const consecutiveErrors =
      typeof rawData.cycle?.consecutiveErrors === "number"
        ? rawData.cycle.consecutiveErrors
        : typeof rawData.cycle?.errors === "number"
          ? rawData.cycle.errors
          : 0;

    const response: DispatcherStatus = {
      cycle: {
        startedAt: rawData.cycle?.startedAt ?? "",
        finishedAt: rawData.cycle?.finishedAt ?? "",
        durationMs: rawData.cycle?.durationMs ?? 0,
        nextRunAt: rawData.cycle?.nextRunAt ?? "",
        consecutiveErrors,
        errors: cycleErrors,
      },
      rateLimit: rawData.rateLimit ?? { remaining: 0, limit: 0, level: "unknown", resetAt: "" },
      phases: rawData.phases ?? {},
      prPipeline: Array.isArray(rawData.prPipeline) ? rawData.prPipeline : [],
      activeAgents,
      completedAgents,
      offline,
    };

    apiCache.set(CACHE_KEY, response, CACHE_TTL_MS);
    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json({ offline: true }, { status: 200 });
  }
}
