"use client";

import { useState, useEffect, useReducer, useRef } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CostsTimelineResponse } from "@/types/costsTimeline";
import CostDailyBreakdown from "@/components/CostDailyBreakdown";

type DaysOption = 7 | 14 | 30 | 0;

const DAYS_OPTIONS: { label: string; value: DaysOption }[] = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "All time", value: 0 },
];

type FetchState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: CostsTimelineResponse };

type FetchAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; data: CostsTimelineResponse }
  | { type: "FETCH_ERROR"; error: string };

function fetchReducer(_state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "FETCH_START":
      return { status: "loading" };
    case "FETCH_SUCCESS":
      return { status: "success", data: action.data };
    case "FETCH_ERROR":
      return { status: "error", error: action.error };
  }
}

// Distinct, theme-friendly colors for up to 10 projects
const PROJECT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#a855f7",
  "#84cc16",
];

function Skeleton() {
  return (
    <div
      data-testid="timeline-skeleton"
      className="animate-pulse space-y-3"
      aria-label="Loading timeline"
    >
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
      <div className="h-48 rounded bg-gray-200 dark:bg-white/10" />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="timeline-empty"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        No cost data available
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Session costs will appear here once agents have run.
      </p>
    </div>
  );
}

export default function CostTimeline() {
  const [days, setDays] = useState<DaysOption>(7);
  const [fetchState, dispatch] = useReducer(fetchReducer, { status: "loading" });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartVisible, setChartVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setChartVisible(width > 0 && height > 0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "FETCH_START" });

    fetch(`/api/costs/timeline?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CostsTimelineResponse>;
      })
      .then((json) => {
        if (!cancelled) dispatch({ type: "FETCH_SUCCESS", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          dispatch({
            type: "FETCH_ERROR",
            error: err instanceof Error ? err.message : "Failed to load",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const isLoading = fetchState.status === "loading";
  const data =
    fetchState.status === "success" ? fetchState.data : null;
  const error =
    fetchState.status === "error" ? fetchState.error : null;

  // Transform data into recharts format: [{ date, project1: N, project2: N, ... }]
  const chartData =
    data?.dates.map((date, i) => {
      const point: Record<string, string | number> = { date };
      for (const series of data.series) {
        point[series.project] = series.data[i] ?? 0;
      }
      return point;
    }) ?? [];

  const isEmpty = !isLoading && (!data || data.series.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Session Timeline
        </h2>
        <div
          className="flex gap-1"
          role="group"
          aria-label="Date range selector"
        >
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`range-${opt.value}`}
              onClick={() => setDays(opt.value)}
              className={[
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                days === opt.value
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton />}

      {!isLoading && error && (
        <p className="text-sm text-red-500" data-testid="timeline-error">
          {error}
        </p>
      )}

      {isEmpty && <EmptyState />}

      {!isLoading && !error && !isEmpty && (
        <div ref={containerRef} className="h-56 w-full" data-testid="timeline-chart">
          {chartVisible && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(val: string) => val.slice(5)} // MM-DD
                />
                <YAxis
                  tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{
                    color: isDark ? "#d1d5db" : "#374151",
                    marginBottom: "4px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                {data!.series.map((series, idx) => (
                  <Line
                    key={series.project}
                    type="monotone"
                    dataKey={series.project}
                    stroke={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!isLoading && !error && data && data.breakdown.length > 0 && (
        <CostDailyBreakdown breakdown={data.breakdown} />
      )}
    </div>
  );
}
