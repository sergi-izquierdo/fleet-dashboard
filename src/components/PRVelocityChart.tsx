"use client";

import {
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { PRTrendDay } from "@/app/api/pr-trends/route";

const REFRESH_INTERVAL_MS = 60_000;

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeRollingAverage(
  data: PRTrendDay[],
  window: number
): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    const sum = slice.reduce((acc, d) => acc + d.count, 0);
    return Math.round((sum / window) * 10) / 10;
  });
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PRVelocityChart() {
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [trends, setTrends] = useState<PRTrendDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchTrends = useCallback(async () => {
    try {
      const response = await fetch("/api/pr-trends");
      if (!response.ok) {
        throw new Error(`Failed to fetch PR trends: ${response.status}`);
      }
      const data = await response.json();
      setTrends(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load PR velocity"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTrends]);

  const rollingAvg = computeRollingAverage(trends, 3);
  const chartData = trends.map((d, i) => ({
    ...d,
    label: formatDateLabel(d.date),
    rollingAvg: rollingAvg[i],
  }));

  if (!mounted) {
    return (
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
        data-testid="pr-velocity-chart"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      data-testid="pr-velocity-chart"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          PR Velocity
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PRs merged per day — last 14 days with 3-day rolling average
        </p>
      </div>

      {isLoading && trends.length === 0 ? (
        <div
          data-testid="pr-velocity-loading"
          className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
        />
      ) : error ? (
        <div
          data-testid="pr-velocity-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
        >
          {error}
        </div>
      ) : (
        <div
          ref={containerRef}
          data-testid="pr-velocity-chart-container"
          className="h-48 w-full"
        >
          {isVisible && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-gray-500 dark:text-gray-400"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--tooltip-bg, #1f2937)",
                    borderColor: "var(--tooltip-border, #374151)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{ color: "#d1d5db" }}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.7rem" }}
                />
                <Bar
                  dataKey="count"
                  fill="#22c55e"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                  name="Merged PRs"
                />
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="3-day avg"
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
