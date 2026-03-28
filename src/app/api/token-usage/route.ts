import { NextRequest, NextResponse } from "next/server";
import type {
  TokenUsageResponse,
  TokenUsageEntry,
  ProjectTokenUsage,
  TimeRange,
} from "@/types/tokenUsage";

const OBS_SERVER_URL =
  process.env.OBS_SERVER_URL || "http://localhost:4100";
const FETCH_TIMEOUT_MS = 10_000;

// Cost per 1M tokens (rough Claude estimates, configurable via env)
const INPUT_COST_PER_M =
  Number(process.env.TOKEN_COST_INPUT_PER_M) || 3.0;
const OUTPUT_COST_PER_M =
  Number(process.env.TOKEN_COST_OUTPUT_PER_M) || 15.0;

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
    case "24h":
      from.setHours(from.getHours() - 24);
      break;
    case "7d":
    case "daily":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
    case "weekly":
      from.setDate(from.getDate() - 30);
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
  if (range === "weekly" || range === "30d") {
    // Group by week start (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  }
  if (range === "24h") {
    // Group by hour
    return `${d.toISOString().slice(0, 13)}:00`;
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
// GET handler
// ---------------------------------------------------------------------------

const VALID_RANGES: TimeRange[] = ["daily", "weekly", "monthly", "24h", "7d", "30d"];

export async function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ??
    "daily") as TimeRange;

  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json(
      { error: "Invalid range. Use daily, weekly, monthly, 24h, 7d, or 30d." },
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
      "Obs server unreachable, returning empty state:",
      obsError instanceof Error ? obsError.message : obsError
    );
  }

  // --- No data available: return empty state ---
  return NextResponse.json(
    {
      timeSeries: [],
      byProject: [],
      totalCost: 0,
      totalTokens: 0,
      source: "empty",
    } satisfies TokenUsageResponse,
    { status: 200 }
  );
}
