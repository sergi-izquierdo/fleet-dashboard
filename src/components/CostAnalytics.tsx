"use client";

import { useSyncExternalStore, useEffect } from "react";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TimeRange } from "@/types/tokenUsage";
import EmptyState from "@/components/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-white/10 ${className ?? ""}`}
    />
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function CostAnalytics() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [persistedRange, setPersistedRange] = useLocalStorage<TimeRange>("fleet-cost-range", "7d");
  const { data, isLoading, error, range, setRange } = useTokenUsage(persistedRange);

  // Sync persisted range into token usage hook after localStorage hydrates
  useEffect(() => {
    setRange(persistedRange);
  }, [persistedRange, setRange]);

  const handleRangeChange = (r: TimeRange) => {
    setRange(r);
    setPersistedRange(r);
  };

  if (!mounted) {
    return (
      <div data-testid="cost-analytics" className="space-y-4">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-48" />
      </div>
    );
  }

  const isEmpty = !data || data.source === "empty" || (data.byProject.length === 0 && data.timeSeries.length === 0);

  return (
    <div data-testid="cost-analytics" className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 p-0.5 w-fit">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRangeChange(opt.value)}
            data-testid={`range-${opt.value}`}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              range === opt.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          data-testid="cost-analytics-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-48" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          title="No cost data available"
          description="Start the observability server to see real cost analytics."
        />
      ) : data ? (
        <>
          {/* Total spend card */}
          <div
            data-testid="total-spend-card"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCost(data.totalCost)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Total Spend
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTokens(data.totalTokens)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Total Tokens
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTokens(data.byProject.reduce((s, p) => s + p.inputTokens, 0))}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Input Tokens
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTokens(data.byProject.reduce((s, p) => s + p.outputTokens, 0))}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                Output Tokens
              </p>
            </div>
          </div>

          {/* Cost breakdown by project */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Cost by Project
            </h3>
            <div
              className="h-64"
              data-testid="cost-by-project-chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byProject} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-white/10"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatCost}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-gray-400 dark:text-white/40"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-gray-400 dark:text-white/40"
                  />
                  <Tooltip
                    formatter={(value) => [formatCost(Number(value)), "Cost"]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid rgba(128,128,128,0.2)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="cost" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost per agent table */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Cost per Agent
            </h3>
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-sm"
                data-testid="cost-per-agent-table"
              >
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-white/50">
                    <th className="pb-2 pr-4 font-medium">Agent / Model</th>
                    <th className="pb-2 pr-4 font-medium text-right">Input Tokens</th>
                    <th className="pb-2 pr-4 font-medium text-right">Output Tokens</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total Tokens</th>
                    <th className="pb-2 font-medium text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProject.map((agent) => (
                    <tr
                      key={agent.name}
                      className="border-b border-gray-100 dark:border-white/5"
                      data-testid="agent-cost-row"
                    >
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                        {agent.name}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(agent.inputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(agent.outputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(agent.totalTokens)}
                      </td>
                      <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCost(agent.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 dark:border-white/20">
                    <td className="pt-2 pr-4 font-semibold text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="pt-2 pr-4 text-right font-semibold text-gray-900 dark:text-white">
                      {formatTokens(data.byProject.reduce((s, p) => s + p.inputTokens, 0))}
                    </td>
                    <td className="pt-2 pr-4 text-right font-semibold text-gray-900 dark:text-white">
                      {formatTokens(data.byProject.reduce((s, p) => s + p.outputTokens, 0))}
                    </td>
                    <td className="pt-2 pr-4 text-right font-semibold text-gray-900 dark:text-white">
                      {formatTokens(data.totalTokens)}
                    </td>
                    <td className="pt-2 text-right font-semibold text-green-600 dark:text-green-400">
                      {formatCost(data.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
