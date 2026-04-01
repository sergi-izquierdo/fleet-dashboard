"use client";

import {
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TimelineAgent } from "@/lib/agentTimeline";

type Range = "6h" | "24h" | "7d";

const RANGE_LABELS: { value: Range; label: string }[] = [
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

const STATUS_COLORS: Record<string, string> = {
  success: "#22c55e",
  failed: "#ef4444",
  timeout: "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Success",
  failed: "Failed",
  timeout: "Timeout",
};

function rangeToMs(range: Range): number {
  if (range === "6h") return 6 * 60 * 60 * 1000;
  if (range === "24h") return 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function formatAxisTime(ts: number, range: Range): string {
  const d = new Date(ts);
  if (range === "7d") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function truncateName(name: string, maxLen = 24): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

interface ChartEntry {
  name: string;
  displayName: string;
  project: string;
  issue: number;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  status: string;
  prUrl: string;
  // recharts bar data: [offset from chart start, duration span]
  placeholder: number;
  span: number;
}

function buildChartData(
  agents: TimelineAgent[],
  range: Range,
): { entries: ChartEntry[]; domainStart: number; domainEnd: number } {
  const now = Date.now();
  const windowMs = rangeToMs(range);
  const domainStart = now - windowMs;
  const domainEnd = now;

  const filtered = agents.filter(
    (a) => new Date(a.completedAt).getTime() >= domainStart,
  );

  const entries: ChartEntry[] = filtered.map((a) => {
    const startMs = Math.max(new Date(a.startedAt).getTime(), domainStart);
    const endMs = Math.min(new Date(a.completedAt).getTime(), domainEnd);
    return {
      name: a.name,
      displayName: truncateName(a.name),
      project: a.project,
      issue: a.issue,
      startMs,
      endMs,
      durationMinutes: a.durationMinutes,
      status: a.status,
      prUrl: a.prUrl,
      placeholder: startMs - domainStart,
      span: Math.max(1, endMs - startMs),
    };
  });

  return { entries, domainStart, domainEnd };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartEntry }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const statusLabel = STATUS_LABELS[d.status] ?? d.status;
  const statusColor = STATUS_COLORS[d.status] ?? "#9ca3af";

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg"
      data-testid="timeline-tooltip"
    >
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{d.name}</p>
      <p className="text-gray-500 dark:text-gray-400">
        Issue <span className="text-gray-700 dark:text-gray-200">#{d.issue}</span>
        {" · "}
        <span className="text-gray-700 dark:text-gray-200">{d.project}</span>
      </p>
      <p className="text-gray-500 dark:text-gray-400">
        Duration:{" "}
        <span className="text-gray-700 dark:text-gray-200">
          {d.durationMinutes}m
        </span>
      </p>
      <p>
        <span style={{ color: statusColor }}>{statusLabel}</span>
      </p>
      {d.prUrl && (
        <a
          href={d.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-blue-500 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View PR →
        </a>
      )}
    </div>
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AgentTimeline() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [agents, setAgents] = useState<TimelineAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("24h");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setIsVisible(width > 0 && height > 0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/timeline");
      if (!res.ok) throw new Error(`Failed to fetch timeline: ${res.status}`);
      const data = await res.json();
      setAgents(Array.isArray(data.agents) ? data.agents : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 30_000);
    return () => clearInterval(interval);
  }, [fetchTimeline]);

  const { entries, domainStart, domainEnd } = buildChartData(agents, range);
  const domainSpan = domainEnd - domainStart;

  const chartHeight = Math.max(120, entries.length * 28 + 40);

  if (!mounted) {
    return (
      <div
        className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4"
        data-testid="agent-timeline"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-48 rounded-lg bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4"
      data-testid="agent-timeline"
    >
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Agent Timeline
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Gantt chart of agent lifetimes
          </p>
        </div>
        <div className="flex gap-1" data-testid="range-selector">
          {RANGE_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === value
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
              }`}
              data-testid={`range-${value}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && agents.length === 0 ? (
        <div
          data-testid="timeline-loading"
          className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"
        />
      ) : error ? (
        <div
          data-testid="timeline-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
        >
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div
          data-testid="timeline-empty"
          className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400"
        >
          No completed agents in this time range
        </div>
      ) : (
        <div ref={containerRef} data-testid="timeline-chart-container">
          {isVisible && (
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={entries}
                  margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                  barCategoryGap={4}
                >
                  <XAxis
                    type="number"
                    domain={[0, domainSpan]}
                    tickCount={5}
                    tickFormatter={(v: number) =>
                      formatAxisTime(domainStart + v, range)
                    }
                    tick={{ fontSize: 9, fill: "currentColor" }}
                    className="text-gray-500 dark:text-gray-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={110}
                    tick={{ fontSize: 9, fill: "currentColor" }}
                    className="text-gray-500 dark:text-gray-400"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(139,92,246,0.05)" }}
                  />
                  {/* Invisible placeholder bar to offset bar start */}
                  <Bar dataKey="placeholder" stackId="gantt" fill="transparent" isAnimationActive={false} />
                  {/* Visible duration bar */}
                  <Bar dataKey="span" stackId="gantt" radius={[2, 2, 2, 2]} isAnimationActive={false}>
                    {entries.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.status] ?? "#9ca3af"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legend */}
          <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
