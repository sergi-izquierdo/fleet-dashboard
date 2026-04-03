import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as path from "path";
import * as os from "os";
import { parseJSONLEntries } from "@/lib/costsByProject";
import type { AgentCostEntry } from "@/types/costsByProject";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const ARCHIVE_PATH = STATE_PATH.replace("state.json", "state-archive.jsonl");

const COSTS_PATH = path.join(
  os.homedir(),
  "agent-fleet",
  "logs",
  "agent-costs.jsonl"
);

interface ArchiveEntry {
  _key: string;
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
  _archivedAt?: string;
  startedAt?: string;
}

interface StateCompleted {
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
  startedAt?: string;
}

export interface ReportsSummary {
  totalAgents: number;
  totalPrsCreated: number;
  totalPrsMerged: number;
  successRate: number | null;
  mostActiveProject: string | null;
  busiestDay: string | null;
  avgDurationMinutes: number | null;
}

const PR_CREATED_STATUSES = new Set([
  "pr_created",
  "pr_open",
  "pr_merged",
  "pr_exists",
  "merged",
]);
const PR_MERGED_STATUSES = new Set(["pr_merged", "merged"]);

function parseDateToDay(ts: string): string {
  return ts.split("T")[0] ?? ts;
}

async function readStateCompleted(): Promise<StateCompleted[]> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const state = JSON.parse(raw) as {
      completed?: Record<string, StateCompleted>;
    };
    return Object.values(state.completed ?? {});
  } catch {
    return [];
  }
}

async function readArchive(): Promise<ArchiveEntry[]> {
  try {
    const raw = await readFile(ARCHIVE_PATH, "utf-8");
    const entries: ArchiveEntry[] = [];
    for (const line of raw.trim().split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        entries.push({
          _key: String(parsed._key ?? "unknown"),
          repo: String(parsed.repo ?? ""),
          issue: Number(parsed.issue ?? 0),
          title: String(parsed.title ?? ""),
          pr: String(parsed.pr ?? ""),
          status: String(parsed.status ?? ""),
          completedAt: String(
            parsed._archivedAt ?? parsed.completedAt ?? ""
          ),
          startedAt:
            typeof parsed.startedAt === "string" ? parsed.startedAt : undefined,
        });
      } catch {
        // skip invalid lines
      }
    }
    return entries;
  } catch {
    return [];
  }
}

async function readCostEntries(): Promise<AgentCostEntry[]> {
  try {
    const content = await readFile(COSTS_PATH, "utf-8");
    return parseJSONLEntries(content);
  } catch {
    return [];
  }
}

export async function GET(_request: Request) {
  const [stateCompleted, archiveEntries, costEntries] = await Promise.all([
    readStateCompleted(),
    readArchive(),
    readCostEntries(),
  ]);

  // De-duplicate by combining archive (older) + stateCompleted (newer/current)
  // We count all unique agents from both sources
  const totalAgents = archiveEntries.length + stateCompleted.length;

  // Compute PR stats from both sources
  let totalPrsCreated = 0;
  let totalPrsMerged = 0;

  const allStatuses = [
    ...archiveEntries.map((e) => e.status),
    ...stateCompleted.map((e) => e.status),
  ];

  for (const status of allStatuses) {
    if (PR_CREATED_STATUSES.has(status)) totalPrsCreated++;
    if (PR_MERGED_STATUSES.has(status)) totalPrsMerged++;
  }

  const successRate =
    totalAgents > 0 ? Math.round((totalPrsMerged / totalAgents) * 100) : null;

  // Most active project from cost entries (most sessions)
  const projectCounts = new Map<string, number>();
  for (const entry of costEntries) {
    if (!entry.agent_name) continue;
    // Extract project from agent name (agent-{project}-{num})
    const match = entry.agent_name.match(/^agent-(.+)-\d+$/);
    const project = match ? match[1] : entry.agent_name;
    projectCounts.set(project, (projectCounts.get(project) ?? 0) + 1);
  }

  let mostActiveProject: string | null = null;
  let maxCount = 0;
  for (const [project, count] of projectCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveProject = project;
    }
  }

  // Busiest day from all completed agents
  const dayCounts = new Map<string, number>();
  for (const entry of archiveEntries) {
    if (!entry.completedAt) continue;
    const day = parseDateToDay(entry.completedAt);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  for (const entry of stateCompleted) {
    if (!entry.completedAt) continue;
    const day = parseDateToDay(entry.completedAt);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  let busiestDay: string | null = null;
  let maxDayCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxDayCount) {
      maxDayCount = count;
      busiestDay = day;
    }
  }

  // Average agent duration from entries that have both startedAt and completedAt
  const durations: number[] = [];
  const allWithDuration: Array<{ startedAt?: string; completedAt: string }> = [
    ...archiveEntries,
    ...stateCompleted,
  ];

  for (const entry of allWithDuration) {
    if (!entry.startedAt || !entry.completedAt) continue;
    const start = new Date(entry.startedAt).getTime();
    const end = new Date(entry.completedAt).getTime();
    const diffMinutes = (end - start) / 60_000;
    if (diffMinutes >= 0 && diffMinutes < 1440) {
      // sanity check: under 24h
      durations.push(diffMinutes);
    }
  }

  const avgDurationMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const summary: ReportsSummary = {
    totalAgents,
    totalPrsCreated,
    totalPrsMerged,
    successRate,
    mostActiveProject,
    busiestDay,
    avgDurationMinutes,
  };

  return NextResponse.json(summary, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
  });
}
