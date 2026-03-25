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
    const data = JSON.parse(raw) as DispatcherStatus;

    const finishedAt = data.cycle?.finishedAt
      ? new Date(data.cycle.finishedAt).getTime()
      : 0;
    const ageSeconds = (Date.now() - finishedAt) / 1000;
    const offline = ageSeconds > OFFLINE_THRESHOLD_S;

    const response: DispatcherStatus = { ...data, offline };
    apiCache.set(CACHE_KEY, response, CACHE_TTL_MS);
    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json({ offline: true }, { status: 200 });
  }
}
