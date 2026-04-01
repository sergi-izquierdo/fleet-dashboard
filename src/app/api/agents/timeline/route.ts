import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import {
  buildTimelineResponse,
  type TimelineResponse,
  type TimelineStateJson,
} from "@/lib/agentTimeline";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const CACHE_KEY = "api:agents:timeline";
const CACHE_TTL_MS = 30_000;

async function readStateJson(): Promise<TimelineStateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as TimelineStateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<TimelineResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=5" },
      });
    }
  }

  const state = await readStateJson();
  const data = buildTimelineResponse(state);
  apiCache.set(CACHE_KEY, data, CACHE_TTL_MS);

  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=5" },
  });
}
