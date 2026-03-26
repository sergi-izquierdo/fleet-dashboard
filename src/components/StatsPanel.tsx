import type { Agent, PR } from "@/types/dashboard";

interface StatsPanelProps {
  agents: Agent[];
  prs: PR[];
  successRate?: number | null;
  avgTimeToMerge?: number | null;
}

export default function StatsPanel({ agents, prs, successRate, avgTimeToMerge }: StatsPanelProps) {
  if (agents.length === 0) {
    return (
      <p className="text-sm font-medium text-gray-500 dark:text-white/50 text-center py-2">
        Fleet idle &mdash; no active agents
      </p>
    );
  }

  const successRateColor =
    successRate == null
      ? "text-gray-400 dark:text-white/30"
      : successRate > 80
        ? "text-green-600 dark:text-green-400"
        : successRate > 60
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400";

  const stats = [
    {
      label: "Total Agents",
      value: String(agents.length),
      color: "text-gray-900 dark:text-white",
    },
    {
      label: "Active",
      value: String(agents.filter((a) => a.status === "working").length),
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Errors",
      value: String(agents.filter((a) => a.status === "error").length),
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "PRs Open",
      value: String(prs.filter((p) => p.mergeState === "open").length),
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "PRs Merged",
      value: String(prs.filter((p) => p.mergeState === "merged").length),
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "CI Passing",
      value: String(prs.filter((p) => p.ciStatus === "passing").length),
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Success Rate",
      value: successRate != null ? `${Math.round(successRate)}%` : "—",
      color: successRateColor,
    },
    {
      label: "Avg Merge Time",
      value: avgTimeToMerge != null ? `${avgTimeToMerge}m` : "—",
      color: "text-gray-900 dark:text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 stagger-children">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 p-4 text-center transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 dark:hover:border-white/20"
        >
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
