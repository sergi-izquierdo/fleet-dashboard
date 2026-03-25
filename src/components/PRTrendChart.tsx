"use client";

import { useSyncExternalStore } from "react";
import { usePRTrend } from "@/hooks/usePRTrend";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// One color per repo slot — enough for up to 8 repos
const REPO_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

function SkeletonChart() {
  return (
    <div
      data-testid="pr-trend-skeleton"
      className="animate-pulse h-64 rounded-lg bg-gray-200 dark:bg-white/10"
    />
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PRTrendChart() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { data, isLoading, error } = usePRTrend();

  if (!mounted) {
    return (
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
        data-testid="pr-trend-chart"
      >
        <SkeletonChart />
      </div>
    );
  }

  const hasData = data && data.data.length > 0 && data.repos.length > 0;

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      data-testid="pr-trend-chart"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          PR Merges per Day
        </h2>
        <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
          Last 14 days across all repos
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          data-testid="pr-trend-error"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <SkeletonChart />
      ) : hasData ? (
        <div className="h-64" data-testid="pr-trend-bar-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-white/10"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                stroke="currentColor"
                className="text-gray-400 dark:text-white/40"
                tickFormatter={(v: string) => v.slice(5)} // show MM-DD
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-gray-400 dark:text-white/40"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid rgba(128,128,128,0.2)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              {data.repos.map((repo, i) => (
                <Bar
                  key={repo}
                  dataKey={repo}
                  stackId="merges"
                  fill={REPO_COLORS[i % REPO_COLORS.length]}
                  radius={i === data.repos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          data-testid="pr-trend-empty"
          className="h-64 flex items-center justify-center text-sm text-gray-500 dark:text-white/40"
        >
          No merged PRs in the last 14 days
        </div>
      )}
    </div>
  );
}
