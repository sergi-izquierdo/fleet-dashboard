import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  parseJSONLCostEntries,
  buildHeatmapDays,
  type CompletedStateEntry,
} from "@/lib/activityHeatmap";

const COSTS_FILE = path.join(
  os.homedir(),
  "agent-fleet",
  "logs",
  "agent-costs.jsonl"
);

const STATE_FILE = path.join(
  os.homedir(),
  "agent-fleet",
  "orchestrator",
  "state.json"
);

interface StateJson {
  completed?: Record<string, CompletedStateEntry>;
}

export async function GET() {
  let costEntries: ReturnType<typeof parseJSONLCostEntries> = [];
  let completedEntries: CompletedStateEntry[] = [];

  try {
    const content = fs.readFileSync(COSTS_FILE, "utf-8");
    costEntries = parseJSONLCostEntries(content);
  } catch {
    // File may not exist — treat as empty
  }

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(raw) as StateJson;
    completedEntries = Object.values(state.completed ?? {});
  } catch {
    // File may not exist — treat as empty
  }

  const days = buildHeatmapDays(costEntries, completedEntries);

  return NextResponse.json({ days }, { status: 200 });
}
