import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import { buildHealthResponse, type FleetHealthResponse, type StateJson } from "@/lib/fleetHealth";

export type { FleetHealthResponse, RepeatFailure } from "@/lib/fleetHealth";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const CACHE_KEY = "api:stats-health";
const CACHE_TTL_MS = 60_000; // 1 min

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<FleetHealthResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=15" },
      });
    }
  }

  try {
    const state = await readStateJson();
    const result = buildHealthResponse(state);

    apiCache.set(CACHE_KEY, result, CACHE_TTL_MS);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=15" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch fleet health: ${message}` },
      { status: 500 },
    );
  }
}
