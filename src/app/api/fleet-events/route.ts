import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import type { ActivityEvent } from "@/types/dashboard";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const ARCHIVE_PATH = STATE_PATH.replace("state.json", "state-archive.jsonl");

const CACHE_KEY = "api:fleet-events";
const CACHE_TTL_MS = 10_000;

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

const STATUS_TO_EVENT_TYPE: Record<string, ActivityEvent["eventType"]> = {
  pr_created: "pr_created",
  pr_merged: "deploy",
  pr_exists: "pr_created",
  timeout: "error",
  recovered: "review",
  completed: "ci_passed",
};

function statusToEventType(status: string): ActivityEvent["eventType"] {
  return STATUS_TO_EVENT_TYPE[status] ?? "commit";
}

function statusToDescription(title: string, status: string): string {
  switch (status) {
    case "pr_created":
      return `PR created: ${title}`;
    case "pr_merged":
      return `PR merged: ${title}`;
    case "pr_exists":
      return `PR already exists: ${title}`;
    case "timeout":
      return `Agent timed out: ${title}`;
    case "recovered":
      return `Agent recovered: ${title}`;
    case "completed":
      return `Completed: ${title}`;
    default:
      return `${status}: ${title}`;
  }
}

function agentToEvent(key: string, agent: CompletedAgent): ActivityEvent {
  return {
    id: `${key}-${agent.completedAt}`,
    timestamp: agent.completedAt,
    agentName: key,
    eventType: statusToEventType(agent.status),
    description: statusToDescription(agent.title, agent.status),
  };
}

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

async function readArchive(): Promise<Array<{ key: string } & CompletedAgent>> {
  try {
    const raw = await readFile(ARCHIVE_PATH, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      return {
        key: String(parsed._key ?? "unknown"),
        repo: String(parsed.repo ?? ""),
        issue: Number(parsed.issue ?? 0),
        title: String(parsed.title ?? ""),
        pr: String(parsed.pr ?? ""),
        status: String(parsed.status ?? ""),
        completedAt: String(parsed._archivedAt ?? parsed.completedAt ?? ""),
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<ActivityEvent[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=5",
        },
      });
    }
  }

  const [state, archived] = await Promise.all([
    readStateJson(),
    readArchive(),
  ]);

  const events: ActivityEvent[] = [];

  // Events from current state.json completed entries
  for (const [key, agent] of Object.entries(state.completed)) {
    events.push(agentToEvent(key, agent));
  }

  // Events from archive
  for (const entry of archived) {
    events.push(
      agentToEvent(entry.key, {
        repo: entry.repo,
        issue: entry.issue,
        title: entry.title,
        pr: entry.pr,
        status: entry.status,
        completedAt: entry.completedAt,
      }),
    );
  }

  // Sort by timestamp descending, limit to 100
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const limited = events.slice(0, 100);

  apiCache.set(CACHE_KEY, limited, CACHE_TTL_MS);

  return NextResponse.json(limited, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=10, stale-while-revalidate=5",
    },
  });
}
