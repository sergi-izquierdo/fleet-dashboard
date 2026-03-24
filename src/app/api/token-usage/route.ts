import { NextRequest, NextResponse } from "next/server";
import type {
  TokenUsageResponse,
  TokenUsageEntry,
  ProjectTokenUsage,
  TimeRange,
} from "@/types/tokenUsage";

const LANGFUSE_URL = process.env.LANGFUSE_URL || "http://localhost:3050";
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || "";
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || "";
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

function formatDateKey(date: string, range: TimeRange): string {
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

interface LangfuseTrace {
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  totalCost?: number;
}

interface LangfuseTracesResponse {
  data: LangfuseTrace[];
  meta?: { page: number; totalPages: number; totalItems: number };
}

async function fetchLangfuseTraces(
  from: Date,
  to: Date
): Promise<LangfuseTrace[]> {
  const allTraces: LangfuseTrace[] = [];
  let page = 1;
  const limit = 100;

  const auth = Buffer.from(
    `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`
  ).toString("base64");

  while (true) {
    const url = new URL(`${LANGFUSE_URL}/api/public/traces`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fromTimestamp", from.toISOString());
    url.searchParams.set("toTimestamp", to.toISOString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Langfuse API responded with status ${res.status}`);
    }

    const body: LangfuseTracesResponse = await res.json();
    allTraces.push(...body.data);

    if (
      !body.meta ||
      page >= body.meta.totalPages ||
      body.data.length < limit
    ) {
      break;
    }
    page++;
  }

  return allTraces;
}

function aggregateTimeSeries(
  traces: LangfuseTrace[],
  range: TimeRange
): TokenUsageEntry[] {
  const buckets = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();

  for (const trace of traces) {
    const key = formatDateKey(trace.createdAt, range);
    const existing = buckets.get(key) ?? { inputTokens: 0, outputTokens: 0 };
    existing.inputTokens += trace.usage?.input ?? 0;
    existing.outputTokens += trace.usage?.output ?? 0;
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

function aggregateByProject(traces: LangfuseTrace[]): ProjectTokenUsage[] {
  const projects = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();

  for (const trace of traces) {
    const name = trace.name ?? "unknown";
    const existing = projects.get(name) ?? { inputTokens: 0, outputTokens: 0 };
    existing.inputTokens += trace.usage?.input ?? 0;
    existing.outputTokens += trace.usage?.output ?? 0;
    projects.set(name, existing);
  }

  return Array.from(projects.entries())
    .map(([name, { inputTokens, outputTokens }]) => ({
      name,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

function generateMockData(range: TimeRange): TokenUsageResponse {
  const agents = ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"];
  const { from, to } = getDateRange(range);
  const timeSeries: TokenUsageEntry[] = [];

  const current = new Date(from);
  while (current <= to) {
    const key = formatDateKey(current.toISOString(), range);
    if (!timeSeries.find((e) => e.date === key)) {
      const input = Math.floor(Math.random() * 500_000) + 50_000;
      const output = Math.floor(Math.random() * 150_000) + 10_000;
      timeSeries.push({
        date: key,
        inputTokens: input,
        outputTokens: output,
        totalTokens: input + output,
        cost: estimateCost(input, output),
      });
    }
    current.setDate(current.getDate() + (range === "monthly" ? 30 : range === "weekly" ? 7 : 1));
  }

  const byProject: ProjectTokenUsage[] = agents.map((name) => {
    const input = Math.floor(Math.random() * 2_000_000) + 100_000;
    const output = Math.floor(Math.random() * 600_000) + 50_000;
    return {
      name,
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output,
      cost: estimateCost(input, output),
    };
  });

  const totalTokens = byProject.reduce((s, p) => s + p.totalTokens, 0);
  const totalCost = byProject.reduce((s, p) => s + p.cost, 0);

  return { timeSeries, byProject, totalCost, totalTokens, source: "mock" as const };
}

export async function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ??
    "daily") as TimeRange;

  if (!["daily", "weekly", "monthly"].includes(range)) {
    return NextResponse.json(
      { error: "Invalid range. Use daily, weekly, or monthly." },
      { status: 400 }
    );
  }

  try {
    if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
      throw new Error("Langfuse API keys not configured");
    }

    const { from, to } = getDateRange(range);
    const traces = await fetchLangfuseTraces(from, to);

    const timeSeries = aggregateTimeSeries(traces, range);
    const byProject = aggregateByProject(traces);
    const totalTokens = byProject.reduce((s, p) => s + p.totalTokens, 0);
    const totalCost = byProject.reduce((s, p) => s + p.cost, 0);

    return NextResponse.json(
      { timeSeries, byProject, totalCost, totalTokens, source: "langfuse" } satisfies TokenUsageResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Failed to fetch from Langfuse, falling back to mock data:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(generateMockData(range), { status: 200 });
  }
}
