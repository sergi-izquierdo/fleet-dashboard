import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import { execFileAsync } from "@/lib/execFileAsync";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const CACHE_KEY = "api:fleet-state";
const CACHE_TTL_MS = 30_000;

interface CompletedAgent {
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
}

interface StateJson {
  active: Record<string, Record<string, unknown>>;
  completed: Record<string, CompletedAgent>;
}

interface FleetStateResponse {
  active: Record<string, Record<string, unknown>>;
  completed: Array<{
    key: string;
    repo: string;
    issue: number;
    title: string;
    pr: string;
    status: string;
    completedAt: string;
    project: string;
  }>;
  stats: {
    totalCompleted: number;
    byStatus: Record<string, number>;
    byProject: Record<string, number>;
  };
  dispatcherOnline: boolean;
}

async function checkDispatcherOnline(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/systemctl", [
      "--user",
      "is-active",
      "fleet-orchestrator.service",
    ]);
    return stdout.trim() === "active";
  } catch {
    return false;
  }
}

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

function buildResponse(
  state: StateJson,
  dispatcherOnline: boolean,
): FleetStateResponse {
  const completedEntries = Object.entries(state.completed)
    .map(([key, agent]) => ({
      key,
      repo: agent.repo,
      issue: agent.issue,
      title: agent.title,
      pr: agent.pr,
      status: agent.status,
      completedAt: agent.completedAt,
      project: agent.repo.split("/")[1] ?? "unknown",
    }))
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    .slice(0, 50);

  const byStatus: Record<string, number> = {};
  const byProject: Record<string, number> = {};

  for (const entry of completedEntries) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    byProject[entry.project] = (byProject[entry.project] ?? 0) + 1;
  }

  return {
    active: state.active,
    completed: completedEntries,
    stats: {
      totalCompleted: Object.keys(state.completed).length,
      byStatus,
      byProject,
    },
    dispatcherOnline,
  };
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<FleetStateResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=5",
        },
      });
    }
  }

  const [state, dispatcherOnline] = await Promise.all([
    readStateJson(),
    checkDispatcherOnline(),
  ]);

  const data = buildResponse(state, dispatcherOnline);
  apiCache.set(CACHE_KEY, data, CACHE_TTL_MS);

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=10, stale-while-revalidate=5",
    },
  });
}
