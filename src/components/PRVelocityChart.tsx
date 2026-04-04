"use client";

import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from "react";
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
import { useTheme } from "next-themes";
import type { PRTrendDay } from "@/app/api/pr-trends/route";

const REFRESH_INTERVAL_MS = 60_000;

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compute 3-day rolling average at index i (average of i-2, i-1, i). */
function rollingAverage(data: PRTrendDay[], windowSize = 3): (number | null)[] {
  return data.map((_, i) => {
    if (i < windowSize - 1) return null;
    const slice = data.slice(i - windowSize + 1, i + 1);
    const sum = slice.reduce((acc, d) => acc + d.count, 0);
    return Math.round((sum / windowSize) * 10) / 10;
  });
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PRVelocityChart() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
      setError(err instanceof Error ? err.message : "Failed to load PR velocity");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTrends]);

  const averages = rollingAverage(trends);
  const chartData = trends.map((d, i) => ({
    ...d,
    label: formatDateLabel(d.date),
    avg: averages[i],
  }));

  const totalMerges = trends.reduce((sum, d) => sum + d.count, 0);

  if (!mounted) {
    return (
      <div data-testid="pr-velocity-chart">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="pr-velocity-chart">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PRs merged per day — last 14 days
          </p>
        </div>
        {!isLoading && !error && (
          <div className="text-right">
            <div
              className="text-xl font-bold text-emerald-500 dark:text-emerald-400"
              data-testid="pr-velocity-total"
            >
              {totalMerges}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">merged</div>
          </div>
        )}
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
                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{ color: isDark ? "#d1d5db" : "#374151" }}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.65rem", paddingTop: "4px" }}
                />
                <Bar
                  dataKey="count"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                  name="Merged PRs"
                />
                <Line
                  dataKey="avg"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  name="3-day avg"
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
