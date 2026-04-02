"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { CostsByProjectResponse, ProjectCost } from "@/types/costsByProject";
import EmptyState from "@/components/EmptyState";

type Period = "7d" | "all";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All time" },
];

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-white/10 ${className ?? ""}`}
    />
  );
}

export default function CostByProject() {
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<CostsByProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/costs/by-project?period=${period}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as CostsByProjectResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const projects: ProjectCost[] = data?.projects ?? [];
  const isEmpty = !isLoading && projects.length === 0;

  return (
    <div data-testid="cost-by-project" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Activity by Project
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/10 p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              data-testid={`period-${opt.value}`}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          data-testid="cost-by-project-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-32" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          title="No project activity data available"
          description="Session metadata from agent-costs.jsonl will appear here once agents have run."
        />
      ) : (
        <>
          {/* Horizontal bar chart — sessions per project */}
          <div
            data-testid="cost-by-project-chart"
            style={{ height: Math.max(120, projects.length * 40) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projects} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-white/10"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-gray-400 dark:text-white/40"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-gray-400 dark:text-white/40"
                />
                <Tooltip
                  formatter={(value) => [value, "Sessions"]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid rgba(128,128,128,0.2)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="sessionCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-sm"
              data-testid="cost-by-project-table"
            >
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-white/50">
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium text-right">Sessions</th>
                  <th className="pb-2 pr-4 font-medium text-right">Transcript Lines</th>
                  <th className="pb-2 font-medium text-right">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.name}
                    className="border-b border-gray-100 dark:border-white/5"
                    data-testid="project-cost-row"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                      {project.name}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                      {project.sessionCount}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600 dark:text-white/60">
                      {project.transcriptLines}
                    </td>
                    <td className="py-2 text-right text-gray-500 dark:text-white/40">
                      {formatDate(project.lastActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
