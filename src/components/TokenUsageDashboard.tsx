"use client";

import { useSyncExternalStore, useRef, useState, useEffect } from "react";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import type { TimeRange } from "@/types/tokenUsage";
import EmptyState from "@/components/EmptyState";
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

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function SkeletonChart() {
  return (
    <div
      data-testid="token-usage-skeleton"
      className="animate-pulse space-y-4"
    >
      <div className="h-64 rounded-lg bg-gray-200 dark:bg-white/10" />
      <div className="h-64 rounded-lg bg-gray-200 dark:bg-white/10" />
    </div>
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function TokenUsageDashboard() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { data, isLoading, error, range, setRange, isLiveData } = useTokenUsage();

  const timeChartRef = useRef<HTMLDivElement>(null);
  const [isTimeChartVisible, setIsTimeChartVisible] = useState(true);
  useEffect(() => {
    const el = timeChartRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setIsTimeChartVisible(width > 0 && height > 0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const projectChartRef = useRef<HTMLDivElement>(null);
  const [isProjectChartVisible, setIsProjectChartVisible] = useState(true);
  useEffect(() => {
    const el = projectChartRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setIsProjectChartVisible(width > 0 && height > 0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
        data-testid="token-usage-dashboard"
      >
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      data-testid="token-usage-dashboard"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Cost & Token Usage
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
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
      </div>

      {/* Error */}
      {error && (
        <div
          data-testid="token-usage-error"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Data source banner */}
      {!isLoading && data && !isLiveData && (
        <div
          data-testid="data-source-banner"
          className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
          {data.source === "estimated"
            ? "Observability server offline — showing estimated data from dispatcher state"
            : "No data sources available — showing empty data"}
        </div>
      )}

      {isLoading && !data ? (
        <SkeletonChart />
      ) : data && (data.source === "empty" || data.source === "mock") ? (
        <EmptyState
          title="No token data available"
          description="Start the observability server to see real token usage data."
        />
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="token-usage-stats"
          >
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatTokens(data.totalTokens)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                Total Tokens
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCost(data.totalCost)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                Estimated Cost
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatTokens(
                  data.byProject.reduce((s, p) => s + p.inputTokens, 0)
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                Input Tokens
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatTokens(
                  data.byProject.reduce((s, p) => s + p.outputTokens, 0)
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                Output Tokens
              </p>
            </div>
          </div>

          {/* Token Consumption Over Time */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Token Consumption Over Time
            </h3>
            <div
              ref={timeChartRef}
              className="h-64"
              data-testid="token-time-chart"
            >
              {isTimeChartVisible && <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeSeries}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-white/10"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-gray-400 dark:text-white/40"
                  />
                  <YAxis
                    tickFormatter={formatTokens}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-gray-400 dark:text-white/40"
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatTokens(Number(value)),
                      String(name) === "inputTokens" ? "Input" : "Output",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid rgba(128,128,128,0.2)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      String(value) === "inputTokens" ? "Input Tokens" : "Output Tokens"
                    }
                  />
                  <Bar
                    dataKey="inputTokens"
                    stackId="tokens"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="outputTokens"
                    stackId="tokens"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              }
            </div>
          </div>

          {/* Tokens per Agent/Project */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tokens by Agent / Project
            </h3>
            <div
              ref={projectChartRef}
              className="h-64"
              data-testid="token-project-chart"
            >
              {isProjectChartVisible && <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byProject}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-white/10"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatTokens}
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
                    formatter={(value, name) => [
                      formatTokens(Number(value)),
                      String(name) === "inputTokens" ? "Input" : "Output",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid rgba(128,128,128,0.2)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      String(value) === "inputTokens" ? "Input Tokens" : "Output Tokens"
                    }
                  />
                  <Bar
                    dataKey="inputTokens"
                    stackId="tokens"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="outputTokens"
                    stackId="tokens"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              }
            </div>
          </div>

          {/* Cost Breakdown Table */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Cost Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-sm"
                data-testid="cost-table"
              >
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-white/50">
                    <th className="pb-2 pr-4 font-medium">Agent / Project</th>
                    <th className="pb-2 pr-4 font-medium text-right">Input</th>
                    <th className="pb-2 pr-4 font-medium text-right">Output</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProject.map((project) => (
                    <tr
                      key={project.name}
                      className="border-b border-gray-100 dark:border-white/5"
                      data-testid="cost-row"
                    >
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                        {project.name}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(project.inputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(project.outputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                        {formatTokens(project.totalTokens)}
                      </td>
                      <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCost(project.cost)}
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
                      {formatTokens(
                        data.byProject.reduce((s, p) => s + p.inputTokens, 0)
                      )}
                    </td>
                    <td className="pt-2 pr-4 text-right font-semibold text-gray-900 dark:text-white">
                      {formatTokens(
                        data.byProject.reduce((s, p) => s + p.outputTokens, 0)
                      )}
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
        </div>
      ) : null}
    </div>
  );
}
