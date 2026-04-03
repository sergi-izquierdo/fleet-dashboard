"use client";

import { useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { AgentDetailModal } from "@/components/AgentDetailModal";
import { buildCsvString, downloadCsv, todayDateString } from "@/lib/csvExport";

interface CompletedAgentEntry {
  key: string;
  repo: string;
  issue: number;
  title: string;
  pr: string;
  status: string;
  completedAt: string;
  project: string;
}

interface FleetStateResponse {
  active: Record<string, Record<string, unknown>>;
  completed: CompletedAgentEntry[];
  stats: {
    totalCompleted: number;
    byStatus: Record<string, number>;
    byProject: Record<string, number>;
    successRate: number | null;
    avgTimeToMerge: number | null;
  };
  dispatcherOnline: boolean;
}

interface NormalizedAgent {
  key: string;
  name: string;
  project: string;
  issueNumber: number | null;
  status: string;
  duration: string;
  prUrl: string | null;
  prNumber: number | null;
  completedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  working: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  pr_open: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  review_pending: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  approved: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  merged: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  pr_merged: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  idle: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  working: "Working",
  pr_open: "PR Open",
  review_pending: "Review Pending",
  approved: "Approved",
  merged: "Merged",
  pr_merged: "Merged",
  error: "Error",
  idle: "Idle",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      data-testid="agent-list-status-badge"
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function extractProject(repo: string): string {
  const parts = repo.split("/");
  return parts[1] ?? parts[0] ?? repo;
}

function extractPrNumber(prUrl: string): number | null {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function formatDuration(startedAt: string | undefined, completedAt: string): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs < 0) return "—";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

function normalizeActiveAgents(
  active: Record<string, Record<string, unknown>>
): NormalizedAgent[] {
  return Object.entries(active).map(([key, data]) => {
    const repo = typeof data.repo === "string" ? data.repo : "";
    const issue = typeof data.issue === "number" ? data.issue : null;
    const status = typeof data.status === "string" ? data.status : "working";
    const startedAt = typeof data.startedAt === "string" ? data.startedAt : undefined;

    const nowIso = new Date().toISOString();
    return {
      key,
      name: key,
      project: extractProject(repo),
      issueNumber: issue,
      status,
      duration: formatDuration(startedAt, nowIso),
      prUrl: null,
      prNumber: null,
      completedAt: null,
    };
  });
}

function normalizeCompletedAgents(
  completed: CompletedAgentEntry[]
): NormalizedAgent[] {
  return completed.map((agent) => {
    const prNumber = agent.pr ? extractPrNumber(agent.pr) : null;
    return {
      key: agent.key,
      name: agent.key,
      project: extractProject(agent.repo),
      issueNumber: agent.issue ?? null,
      status: agent.status,
      duration: "—",
      prUrl: agent.pr || null,
      prNumber,
      completedAt: agent.completedAt,
    };
  });
}

const ACTIVE_STATUSES = new Set(["working", "pr_open", "review_pending", "approved"]);
const COMPLETED_STATUSES = new Set(["merged", "pr_merged"]);
const ERROR_STATUSES = new Set(["error"]);

const AGENTS_CSV_HEADERS = [
  "Agent Name",
  "Repo",
  "Issue",
  "Status",
  "Started",
  "Completed",
  "Duration",
  "PR URL",
  "Files Modified",
];

function exportAgentsCsv(agents: NormalizedAgent[]): void {
  const rows = agents.map((a) => [
    a.name,
    a.project,
    a.issueNumber != null ? String(a.issueNumber) : "",
    a.status,
    "",
    a.completedAt ?? "",
    a.duration,
    a.prUrl ?? "",
    "",
  ]);
  const csv = buildCsvString(AGENTS_CSV_HEADERS, rows);
  downloadCsv(`fleet-agents-${todayDateString()}.csv`, csv);
}

function matchesStatusFilter(agent: NormalizedAgent, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.has(agent.status);
  if (filter === "completed") return COMPLETED_STATUSES.has(agent.status);
  if (filter === "error") return ERROR_STATUSES.has(agent.status);
  return true;
}

export default function AgentListTable() {
  const [agents, setAgents] = useState<NormalizedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const fetchFleetState = useCallback(async () => {
    try {
      const res = await fetch("/api/fleet-state");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FleetStateResponse = await res.json();

      const active = normalizeActiveAgents(data.active ?? {});
      const completed = normalizeCompletedAgents(data.completed ?? []);

      // Sort by most recent first: active agents first (no completedAt), then completed by date
      const allAgents = [
        ...active,
        ...completed,
      ].sort((a, b) => {
        if (!a.completedAt && !b.completedAt) return 0;
        if (!a.completedAt) return -1;
        if (!b.completedAt) return 1;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });

      setAgents(allAgents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch fleet state");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetState();
  }, [fetchFleetState]);

  const projects = ["all", ...Array.from(new Set(agents.map((a) => a.project).filter(Boolean)))];

  const filtered = agents.filter(
    (a) =>
      (projectFilter === "all" || a.project === projectFilter) &&
      matchesStatusFilter(a, statusFilter)
  );

  return (
    <section aria-label="All agents" className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All Agents
        </h2>
        <button
          data-testid="export-agents-csv"
          onClick={() => exportAgentsCsv(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Export agents as CSV"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div
        data-testid="agent-list-filters"
        className="mb-4 flex flex-wrap gap-3"
      >
        <select
          data-testid="project-filter"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Filter by project"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p === "all" ? "All Projects" : p}
            </option>
          ))}
        </select>

        <select
          data-testid="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
        </select>
      </div>

      {isLoading ? (
        <div data-testid="agent-list-loading" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10"
            />
          ))}
        </div>
      ) : error ? (
        <div
          data-testid="agent-list-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-testid="agent-list-empty"
          className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-8 text-center text-sm text-gray-500 dark:text-white/40"
        >
          No agents match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
          <table
            data-testid="agent-list-table"
            className="w-full text-sm"
          >
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  Agent Name
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  Project
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  Issue #
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  Status
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  Duration
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-gray-500 dark:text-white/50">
                  PR
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr
                  key={agent.key}
                  data-testid="agent-list-row"
                  onClick={() => setSelectedAgent(agent.name)}
                  className="border-b border-gray-200 dark:border-white/[0.06] last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                    {agent.name}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-gray-600 dark:text-white/60">
                    {agent.project || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-white/60">
                    {agent.issueNumber != null ? `#${agent.issueNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-gray-600 dark:text-white/60">
                    {agent.duration}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    {agent.prUrl ? (
                      <a
                        href={agent.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="agent-list-pr-link"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        PR #{agent.prNumber}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-white/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAgent && (
        <AgentDetailModal
          sessionName={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </section>
  );
}
