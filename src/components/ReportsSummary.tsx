"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReportsSummary } from "@/app/api/reports/summary/route";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-gray-500 dark:text-white/40">{sub}</p>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 space-y-2">
      <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
      <div className="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
    </div>
  );
}

export default function ReportsSummaryPanel() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/summary");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ReportsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading) {
    return (
      <div
        data-testid="reports-summary-loading"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="reports-summary-error"
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      data-testid="reports-summary"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <StatCard label="Total Agents Run" value={data.totalAgents} />
      <StatCard label="PRs Created" value={data.totalPRsCreated} />
      <StatCard label="PRs Merged" value={data.totalPRsMerged} />
      <StatCard
        label="Success Rate"
        value={data.successRate !== null ? `${data.successRate}%` : "—"}
      />
      <StatCard
        label="Most Active Project"
        value={data.mostActiveProject ?? "—"}
      />
      <StatCard
        label="Busiest Day"
        value={data.busiestDay ?? "—"}
      />
      <StatCard
        label="Avg Duration"
        value={
          data.avgDurationMinutes !== null
            ? `${data.avgDurationMinutes}m`
            : "—"
        }
      />
    </div>
  );
}
