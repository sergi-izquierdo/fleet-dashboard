import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  buildTimelineResponse,
  parseAgentCostsAsCompleted,
  type TimelineStateJson,
} from "@/lib/agentTimeline";
import { parseJSONLEntries, groupByProject } from "@/lib/costsByProject";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const COSTS_PATH = path.join(
  os.homedir(),
  "agent-fleet",
  "logs",
  "agent-costs.jsonl",
);

export interface ReportsSummary {
  totalAgents: number;
  totalPRsCreated: number;
  totalPRsMerged: number;
  successRate: number | null;
  mostActiveProject: string | null;
  busiestDay: string | null;
  avgDurationMinutes: number | null;
}

async function readStateJson(): Promise<TimelineStateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as TimelineStateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

async function readCostsContent(): Promise<string> {
  try {
    return await readFile(COSTS_PATH, "utf-8");
  } catch {
    return "";
  }
}

function computeBusiestDay(
  completedAgents: Array<{ startedAt: string }>,
): string | null {
  if (completedAgents.length === 0) return null;
  const dayCounts = new Map<string, number>();
  for (const agent of completedAgents) {
    const day = agent.startedAt.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  let busiestDay = "";
  let maxCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      busiestDay = day;
    }
  }
  return busiestDay || null;
}

export async function GET(_request: NextRequest) {
  try {
    const [state, costsContent] = await Promise.all([
      readStateJson(),
      readCostsContent(),
    ]);

    const costCompleted = parseAgentCostsAsCompleted(costsContent);
    const timeline = buildTimelineResponse(state, costCompleted);
    const agents = timeline.agents;

    const totalAgents = agents.length;

    const totalPRsCreated = agents.filter((a) => a.prUrl !== "").length;
    const totalPRsMerged = agents.filter((a) => a.status === "success").length;
    const successRate =
      totalAgents > 0
        ? Math.round((totalPRsMerged / totalAgents) * 100)
        : null;

    const avgDurationMinutes =
      agents.length > 0
        ? Math.round(
            agents.reduce((sum, a) => sum + a.durationMinutes, 0) /
              agents.length,
          )
        : null;

    const busiestDay = computeBusiestDay(
      agents.filter((a) => a.startedAt).map((a) => ({ startedAt: a.startedAt })),
    );

    // Most active project from costs data (all time)
    const costEntries = parseJSONLEntries(costsContent);
    const projectGroups = groupByProject(costEntries);
    const mostActiveProject =
      projectGroups.length > 0 ? projectGroups[0].name : null;

    const summary: ReportsSummary = {
      totalAgents,
      totalPRsCreated,
      totalPRsMerged,
      successRate,
      mostActiveProject,
      busiestDay,
      avgDurationMinutes,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
