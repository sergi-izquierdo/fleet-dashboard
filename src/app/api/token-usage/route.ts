import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import type {
  TokenUsageResponse,
  TokenUsageEntry,
  ProjectTokenUsage,
  TimeRange,
} from "@/types/tokenUsage";

const OBS_SERVER_URL =
  process.env.OBS_SERVER_URL || "http://localhost:4100";
const FLEET_STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";
const FETCH_TIMEOUT_MS = 10_000;

// Cost per 1M tokens (rough Claude estimates, configurable via env)
const INPUT_COST_PER_M =
  Number(process.env.TOKEN_COST_INPUT_PER_M) || 3.0;
const OUTPUT_COST_PER_M =
  Number(process.env.TOKEN_COST_OUTPUT_PER_M) || 15.0;

// Estimated tokens per minute for Claude Code agents (Sonnet-class)
const TOKENS_PER_MINUTE = 2000;
const INPUT_RATIO = 0.7;
const OUTPUT_RATIO = 0.3;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_M
  );
}

function getDateRange(range: TimeRange): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case "daily":
      from.setDate(from.getDate() - 7);
      break;
    case "weekly":
      from.setDate(from.getDate() - 28);
      break;
    case "monthly":
      from.setMonth(from.getMonth() - 6);
      break;
  }
  return { from, to };
}

function formatDateKey(date: string | number, range: TimeRange): string {
  const d = new Date(date);
  if (range === "monthly") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (range === "weekly") {
    // Group by week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Observability server types
// ---------------------------------------------------------------------------

interface ObsEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
  model_name?: string;
}

// ---------------------------------------------------------------------------
// Primary source: Observability Server (port 4100)
// ---------------------------------------------------------------------------

async function fetchObsEvents(
  from: Date,
  _to: Date
): Promise<ObsEvent[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch a large batch of recent events
    const res = await fetch(
      `${OBS_SERVER_URL}/events/recent?limit=5000`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Obs server responded with status ${res.status}`);
    }

    const events: ObsEvent[] = await res.json();

    // Filter to the requested date range
    const fromMs = from.getTime();
    return events.filter((e) => (e.timestamp ?? 0) >= fromMs);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function aggregateObsTimeSeries(
  events: ObsEvent[],
  range: TimeRange
): TokenUsageEntry[] {
  const buckets = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();

  for (const event of events) {
    const ts = event.timestamp ?? Date.now();
    const key = formatDateKey(ts, range);
    const existing = buckets.get(key) ?? { inputTokens: 0, outputTokens: 0 };

    // Each tool-use event represents roughly one turn of work.
    // Use a conservative estimate: ~500 tokens per event (350 input + 150 output).
    const inputEst = 350;
    const outputEst = 150;

    existing.inputTokens += inputEst;
    existing.outputTokens += outputEst;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { inputTokens, outputTokens }]) => ({
      date,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
    }));
}

function aggregateObsByProject(events: ObsEvent[]): ProjectTokenUsage[] {
  // Group by session_id, then derive a project-like name from model or session
  const sessions = new Map<
    string,
    { eventCount: number; model: string }
  >();

  for (const event of events) {
    const sid = event.session_id;
    const existing = sessions.get(sid) ?? { eventCount: 0, model: "unknown" };
    existing.eventCount += 1;
    if (event.model_name) {
      existing.model = event.model_name;
    }
    sessions.set(sid, existing);
  }

  // Aggregate by model name to create a meaningful project-level breakdown
  const byModel = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();

  for (const [, { eventCount, model }] of sessions) {
    const existing = byModel.get(model) ?? { inputTokens: 0, outputTokens: 0 };
    existing.inputTokens += eventCount * 350;
    existing.outputTokens += eventCount * 150;
    byModel.set(model, existing);
  }

  return Array.from(byModel.entries())
    .map(([name, { inputTokens, outputTokens }]) => ({
      name,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

// ---------------------------------------------------------------------------
// Secondary source: State.json estimates
// ---------------------------------------------------------------------------

interface StateAgent {
  repo: string;
  issue: number;
  title: string;
  pr?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
}

interface DispatcherState {
  active: Record<string, StateAgent>;
  completed: Record<string, StateAgent>;
}

async function readDispatcherState(): Promise<DispatcherState> {
  const raw = await fs.readFile(FLEET_STATE_PATH, "utf-8");
  return JSON.parse(raw) as DispatcherState;
}

function estimateFromState(
  state: DispatcherState,
  range: TimeRange
): TokenUsageResponse {
  const { from } = getDateRange(range);
  const fromMs = from.getTime();

  const allAgents: StateAgent[] = [
    ...Object.values(state.active),
    ...Object.values(state.completed),
  ];

  const timeSeriesBuckets = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();
  const projectBuckets = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();

  for (const agent of allAgents) {
    // Determine agent time window
    const startedAt = agent.startedAt
      ? new Date(agent.startedAt).getTime()
      : agent.completedAt
        ? new Date(agent.completedAt).getTime() - 30 * 60_000 // assume 30 min if no startedAt
        : 0;
    const completedAt = agent.completedAt
      ? new Date(agent.completedAt).getTime()
      : Date.now(); // still active

    if (completedAt < fromMs) continue;

    // Duration in minutes
    const durationMin = Math.max(
      1,
      (completedAt - Math.max(startedAt, fromMs)) / 60_000
    );
    const totalTokens = Math.round(durationMin * TOKENS_PER_MINUTE);
    const inputTokens = Math.round(totalTokens * INPUT_RATIO);
    const outputTokens = Math.round(totalTokens * OUTPUT_RATIO);

    // Time series: use completedAt (or startedAt) as the bucket key
    const dateRef = agent.completedAt ?? agent.startedAt ?? new Date().toISOString();
    const dateKey = formatDateKey(dateRef, range);
    const tsExisting = timeSeriesBuckets.get(dateKey) ?? {
      inputTokens: 0,
      outputTokens: 0,
    };
    tsExisting.inputTokens += inputTokens;
    tsExisting.outputTokens += outputTokens;
    timeSeriesBuckets.set(dateKey, tsExisting);

    // Project breakdown
    const projectName = agent.repo.split("/")[1] ?? agent.repo;
    const projExisting = projectBuckets.get(projectName) ?? {
      inputTokens: 0,
      outputTokens: 0,
    };
    projExisting.inputTokens += inputTokens;
    projExisting.outputTokens += outputTokens;
    projectBuckets.set(projectName, projExisting);
  }

  const timeSeries: TokenUsageEntry[] = Array.from(
    timeSeriesBuckets.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { inputTokens, outputTokens }]) => ({
      date,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
    }));

  const byProject: ProjectTokenUsage[] = Array.from(
    projectBuckets.entries()
  )
    .map(([name, { inputTokens, outputTokens }]) => ({
      name,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const totalTokens = byProject.reduce((s, p) => s + p.totalTokens, 0);
  const totalCost = byProject.reduce((s, p) => s + p.cost, 0);

  return {
    timeSeries,
    byProject,
    totalCost,
    totalTokens,
    source: "estimated" as const,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ??
    "daily") as TimeRange;

  if (!["daily", "weekly", "monthly"].includes(range)) {
    return NextResponse.json(
      { error: "Invalid range. Use daily, weekly, or monthly." },
      { status: 400 }
    );
  }

  // --- Primary: Observability Server ---
  try {
    const { from, to } = getDateRange(range);
    const events = await fetchObsEvents(from, to);

    const timeSeries = aggregateObsTimeSeries(events, range);
    const byProject = aggregateObsByProject(events);
    const totalTokens = byProject.reduce((s, p) => s + p.totalTokens, 0);
    const totalCost = byProject.reduce((s, p) => s + p.cost, 0);

    return NextResponse.json(
      {
        timeSeries,
        byProject,
        totalCost,
        totalTokens,
        source: "observability",
      } satisfies TokenUsageResponse,
      { status: 200 }
    );
  } catch (obsError) {
    console.error(
      "Obs server unreachable, falling back to state.json estimates:",
      obsError instanceof Error ? obsError.message : obsError
    );
  }

  // --- Secondary: State.json estimates ---
  try {
    const state = await readDispatcherState();
    const response = estimateFromState(state, range);

    return NextResponse.json(response, { status: 200 });
  } catch (stateError) {
    console.error(
      "Failed to read dispatcher state:",
      stateError instanceof Error ? stateError.message : stateError
    );
  }

  // --- Last resort: generated mock data ---
  const { from } = getDateRange(range);
  const mockTimeSeries: TokenUsageEntry[] = [];
  const cursor = new Date(from);
  const now = new Date();
  while (cursor <= now) {
    const key = formatDateKey(cursor.toISOString(), range);
    if (!mockTimeSeries.find((e) => e.date === key)) {
      const inputTokens = 10000 + Math.floor(Math.random() * 5000);
      const outputTokens = 4000 + Math.floor(Math.random() * 2000);
      mockTimeSeries.push({
        date: key,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: estimateCost(inputTokens, outputTokens),
      });
    }
    if (range === "monthly") {
      cursor.setMonth(cursor.getMonth() + 1);
    } else if (range === "weekly") {
      cursor.setDate(cursor.getDate() + 7);
    } else {
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const mockByProject: ProjectTokenUsage[] = [
    { name: "fleet-dashboard", inputTokens: 42000, outputTokens: 18000, totalTokens: 60000, cost: estimateCost(42000, 18000) },
    { name: "agent-worker", inputTokens: 28000, outputTokens: 12000, totalTokens: 40000, cost: estimateCost(28000, 12000) },
  ];
  const mockTotalTokens = mockByProject.reduce((s, p) => s + p.totalTokens, 0);
  const mockTotalCost = mockByProject.reduce((s, p) => s + p.cost, 0);
  return NextResponse.json(
    {
      timeSeries: mockTimeSeries,
      byProject: mockByProject,
      totalCost: mockTotalCost,
      totalTokens: mockTotalTokens,
      source: "mock",
    } satisfies TokenUsageResponse,
    { status: 200 }
  );
}
