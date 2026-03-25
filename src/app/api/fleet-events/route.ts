import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as apiCache from "@/lib/apiCache";
import type { ActivityEvent } from "@/types/dashboard";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const ARCHIVE_PATH = STATE_PATH.replace("state.json", "state-archive.jsonl");
const OBS_SERVER_URL = process.env.OBS_SERVER_URL || "http://localhost:4100";

const CACHE_KEY = "api:fleet-events";
const CACHE_TTL_MS = 10_000;

// --- Source 1: state.json completed agents ---

interface CompletedAgent {
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
}

interface ActiveAgent {
  repo: string;
  project: string;
  issue: number;
  title: string;
  branch: string;
  tmuxSession: string;
  startedAt: string;
  status: string;
}

interface StateJson {
  active: Record<string, ActiveAgent>;
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

function completedToEvent(key: string, agent: CompletedAgent): ActivityEvent {
  const eventType = STATUS_TO_EVENT_TYPE[agent.status] ?? "commit";
  const prefix =
    agent.status === "pr_created"
      ? "PR created"
      : agent.status === "pr_merged"
        ? "PR merged"
        : agent.status === "timeout"
          ? "Agent timed out"
          : agent.status === "recovered"
            ? "Agent recovered"
            : agent.status === "pr_exists"
              ? "PR already exists"
              : "Completed";

  return {
    id: `completed-${key}-${agent.completedAt}`,
    timestamp: agent.completedAt,
    agentName: key,
    eventType,
    description: `${prefix}: ${agent.title}`,
  };
}

function activeToEvent(key: string, agent: ActiveAgent): ActivityEvent {
  return {
    id: `active-${key}-${agent.startedAt}`,
    timestamp: agent.startedAt,
    agentName: key,
    eventType: "agent_start",
    description: `Agent spawned: ${agent.title}`,
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

async function readArchive(): Promise<ActivityEvent[]> {
  try {
    const raw = await readFile(ARCHIVE_PATH, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const key = String(parsed._key ?? "unknown");
      const agent: CompletedAgent = {
        repo: String(parsed.repo ?? ""),
        issue: Number(parsed.issue ?? 0),
        title: String(parsed.title ?? ""),
        pr: String(parsed.pr ?? ""),
        status: String(parsed.status ?? ""),
        completedAt: String(parsed._archivedAt ?? parsed.completedAt ?? ""),
      };
      return completedToEvent(key, agent);
    });
  } catch {
    return [];
  }
}

// --- Source 2: Observability server (live tool events) ---

interface ObsEvent {
  id: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: {
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    output?: string;
    session_id?: string;
  };
  timestamp: string;
}

function obsEventToActivityEvent(obs: ObsEvent): ActivityEvent | null {
  const agentId = `${obs.source_app}:${obs.session_id.slice(0, 8)}`;
  const hookType = obs.hook_event_type;
  const toolName = obs.payload?.tool_name ?? "";

  if (hookType === "Stop" || hookType === "SubagentStop") {
    return {
      id: `obs-${obs.id}`,
      timestamp: obs.timestamp,
      agentName: agentId,
      eventType: "agent_stop",
      description: `Agent session ended`,
    };
  }

  if (hookType === "PostToolUse" && toolName) {
    // Only include significant tool uses (skip Read/Glob for noise reduction)
    const noisyTools = ["Read", "Glob", "Grep", "LS"];
    if (noisyTools.includes(toolName)) return null;

    let desc = `Used ${toolName}`;
    if (toolName === "Edit" || toolName === "Write") {
      const filePath = obs.payload?.tool_input?.file_path;
      if (typeof filePath === "string") {
        const fileName = filePath.split("/").pop();
        desc = `${toolName}: ${fileName}`;
      }
    } else if (toolName === "Bash") {
      const cmd = obs.payload?.tool_input?.command;
      if (typeof cmd === "string") {
        desc = `Bash: ${cmd.slice(0, 60)}${cmd.length > 60 ? "…" : ""}`;
      }
    }

    return {
      id: `obs-${obs.id}`,
      timestamp: obs.timestamp,
      agentName: agentId,
      eventType: "tool_use",
      description: desc,
    };
  }

  return null;
}

async function fetchObsEvents(limit: number = 100): Promise<ActivityEvent[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `${OBS_SERVER_URL}/events/recent?limit=${limit}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];

    const obsEvents: ObsEvent[] = await res.json();
    return obsEvents
      .map(obsEventToActivityEvent)
      .filter((e): e is ActivityEvent => e !== null);
  } catch {
    // Obs server unavailable — degrade gracefully
    return [];
  }
}

// --- Combine all sources ---

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "true";

  if (!fresh) {
    const cached = apiCache.get<ActivityEvent[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=5",
        },
      });
    }
  }

  // Fetch all 3 sources in parallel
  const [state, archived, obsEvents] = await Promise.all([
    readStateJson(),
    readArchive(),
    fetchObsEvents(200),
  ]);

  const events: ActivityEvent[] = [];

  // Source 1a: Active agents (currently running)
  for (const [key, agent] of Object.entries(state.active ?? {})) {
    events.push(activeToEvent(key, agent));
  }

  // Source 1b: Completed agents
  for (const [key, agent] of Object.entries(state.completed ?? {})) {
    events.push(completedToEvent(key, agent));
  }

  // Source 2: Archive
  events.push(...archived);

  // Source 3: Live obs events (tool calls, agent stops)
  events.push(...obsEvents);

  // Sort by timestamp descending, limit to 200
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const limited = events.slice(0, 200);

  apiCache.set(CACHE_KEY, limited, CACHE_TTL_MS);

  return NextResponse.json(limited, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=5, stale-while-revalidate=5",
    },
  });
}
