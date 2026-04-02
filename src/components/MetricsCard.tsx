"use client";

import { useMemo } from "react";
import { BarChart3, CheckCircle2, FolderGit2, Bot } from "lucide-react";
import type { ActivityEvent } from "@/types/dashboard";
import { computeFleetMetrics } from "@/lib/metricsComputation";

interface MetricItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
}

function MetricItem({ icon: Icon, label, value, subtitle }: MetricItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-white/[0.05] p-2">
        <Icon className="h-4 w-4 text-white/50" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-white/40">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-white/30 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

interface MetricsCardProps {
  activityLog: ActivityEvent[];
}

export default function MetricsCard({ activityLog }: MetricsCardProps) {
  const metrics = useMemo(() => computeFleetMetrics(activityLog), [activityLog]);

  if (metrics.totalAgentsRun === 0) {
    return (
      <div
        data-testid="metrics-card-empty"
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]"
      >
        <BarChart3 className="h-6 w-6 text-white/20" />
        <p className="text-sm text-gray-500 dark:text-white/40">
          No completed agents yet
        </p>
        <p className="text-xs text-gray-400 dark:text-white/25">
          Metrics will appear once agents finish their runs
        </p>
      </div>
    );
  }

  const successRateLabel =
    metrics.successRate !== null ? `${metrics.successRate}%` : "—";

  return (
    <div
      data-testid="metrics-card"
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-4 w-4 text-white/30" />
        <h2 className="text-sm font-semibold text-white/70">Fleet Metrics</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricItem
          icon={Bot}
          label="Total Agents Run"
          value={String(metrics.totalAgentsRun)}
        />
        <MetricItem
          icon={CheckCircle2}
          label="Success Rate"
          value={successRateLabel}
          subtitle={`${metrics.successCount} merged · ${metrics.errorCount} failed`}
        />
        <MetricItem
          icon={FolderGit2}
          label="Most Active Project"
          value={metrics.mostActiveProject ?? "—"}
        />
      </div>
    </div>
  );
}
