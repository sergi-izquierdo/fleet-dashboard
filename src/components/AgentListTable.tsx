"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Download } from "lucide-react";
import { AgentDetailModal } from "@/components/AgentDetailModal";
import { FilterBar } from "@/components/FilterBar";
import { buildCSV, downloadCSV, todayDateString } from "@/lib/csvExport";
import { useLocalStorage } from "@/hooks/useLocalStorage";

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
  issueTitle: string | null;
  status: string;
  duration: string;
  durationMs: number;
  prUrl: string | null;
  prNumber: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

type SortBy = "startTime" | "duration" | "status";
type SortDir = "asc" | "desc";

interface AgentFilters {
  searchQuery: string;
  statusFilter: string;
  projectFilter: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

const DEFAULT_FILTERS: AgentFilters = {
  searchQuery: "",
  statusFilter: "all",
  projectFilter: "all",
  sortBy: "startTime",
  sortDir: "desc",
};

const STATUS_STYLES: Record<string, string> = {
  working: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  pr_open: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  review_pending: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  approved: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  merged: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  pr_merged: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  timed_out: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
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
  failed: "Failed",
  timed_out: "Timed Out",
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

function calcDurationMs(startedAt: string | undefined, completedAt: string): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMs = end - start;
  return isNaN(diffMs) || diffMs < 0 ? 0 : diffMs;
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
      issueTitle: null,
      status,
      duration: formatDuration(startedAt, nowIso),
      durationMs: calcDurationMs(startedAt, nowIso),
      prUrl: null,
      prNumber: null,
      startedAt: startedAt ?? null,
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
      issueTitle: agent.title ?? null,
      status: agent.status,
      duration: "—",
      durationMs: 0,
      prUrl: agent.pr || null,
      prNumber,
      startedAt: null,
      completedAt: agent.completedAt,
    };
  });
}

const ACTIVE_STATUSES = new Set(["working", "pr_open", "review_pending", "approved"]);
const COMPLETED_STATUSES = new Set(["merged", "pr_merged"]);
const ERROR_STATUSES = new Set(["error"]);
const FAILED_STATUSES = new Set(["failed"]);
const TIMED_OUT_STATUSES = new Set(["timed_out"]);

function matchesStatusFilter(agent: NormalizedAgent, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.has(agent.status);
  if (filter === "completed") return COMPLETED_STATUSES.has(agent.status);
  if (filter === "error") return ERROR_STATUSES.has(agent.status);
  if (filter === "failed") return FAILED_STATUSES.has(agent.status);
  if (filter === "timedOut") return TIMED_OUT_STATUSES.has(agent.status);
  return true;
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Statuses",
  active: "Active",
  completed: "Completed",
  error: "Error",
  failed: "Failed",
  timedOut: "Timed Out",
};

const SORT_BY_LABELS: Record<SortBy, string> = {
  startTime: "Start Time",
  duration: "Duration",
  status: "Status",
};

function sortAgents(agents: NormalizedAgent[], sortBy: SortBy, sortDir: SortDir): NormalizedAgent[] {
  const multiplier = sortDir === "asc" ? 1 : -1;
  return [...agents].sort((a, b) => {
    if (sortBy === "startTime") {
      const aTime = a.startedAt ?? a.completedAt ?? "";
      const bTime = b.startedAt ?? b.completedAt ?? "";
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1 * multiplier;
      if (!bTime) return -1 * multiplier;
      return (new Date(aTime).getTime() - new Date(bTime).getTime()) * multiplier;
    }
    if (sortBy === "duration") {
      return (a.durationMs - b.durationMs) * multiplier;
    }
    if (sortBy === "status") {
      return a.status.localeCompare(b.status) * multiplier;
    }
    return 0;
  });
}

function matchesSearch(agent: NormalizedAgent, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    agent.name.toLowerCase().includes(q) ||
    agent.project.toLowerCase().includes(q) ||
    (agent.issueNumber !== null && String(agent.issueNumber).includes(q)) ||
    (agent.issueTitle !== null && agent.issueTitle.toLowerCase().includes(q))
  );
}

export default function AgentListTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [agents, setAgents] = useState<NormalizedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const [persistedFilters, setPersistedFilters] = useLocalStorage<AgentFilters>(
    "fleet-agent-filters",
    DEFAULT_FILTERS
  );

  // Filter state — URL params take precedence over localStorage
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? persistedFilters.searchQuery
  );
  const [projectFilter, setProjectFilter] = useState(
    searchParams.get("project") ?? persistedFilters.projectFilter
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? persistedFilters.statusFilter
  );
  const [sortBy, setSortBy] = useState<SortBy>(
    (searchParams.get("sort") as SortBy) ?? persistedFilters.sortBy
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    (searchParams.get("dir") as SortDir) ?? persistedFilters.sortDir
  );

  const updateUrlParams = useCallback(
    (q: string, project: string, status: string, sort: SortBy, dir: SortDir) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q); else params.delete("q");
      if (project !== "all") params.set("project", project); else params.delete("project");
      if (status !== "all") params.set("status", status); else params.delete("status");
      if (sort !== "startTime") params.set("sort", sort); else params.delete("sort");
      if (dir !== "desc") params.set("dir", dir); else params.delete("dir");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const persistFilters = useCallback(
    (q: string, project: string, status: string, sort: SortBy, dir: SortDir) => {
      setPersistedFilters({ searchQuery: q, projectFilter: project, statusFilter: status, sortBy: sort, sortDir: dir });
    },
    [setPersistedFilters]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      updateUrlParams(value, projectFilter, statusFilter, sortBy, sortDir);
      persistFilters(value, projectFilter, statusFilter, sortBy, sortDir);
    },
    [updateUrlParams, persistFilters, projectFilter, statusFilter, sortBy, sortDir]
  );

  const handleProjectChange = useCallback(
    (value: string) => {
      setProjectFilter(value);
      updateUrlParams(searchQuery, value, statusFilter, sortBy, sortDir);
      persistFilters(searchQuery, value, statusFilter, sortBy, sortDir);
    },
    [updateUrlParams, persistFilters, searchQuery, statusFilter, sortBy, sortDir]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      updateUrlParams(searchQuery, projectFilter, value, sortBy, sortDir);
      persistFilters(searchQuery, projectFilter, value, sortBy, sortDir);
    },
    [updateUrlParams, persistFilters, searchQuery, projectFilter, sortBy, sortDir]
  );

  const handleSortByChange = useCallback(
    (value: SortBy) => {
      setSortBy(value);
      updateUrlParams(searchQuery, projectFilter, statusFilter, value, sortDir);
      persistFilters(searchQuery, projectFilter, statusFilter, value, sortDir);
    },
    [updateUrlParams, persistFilters, searchQuery, projectFilter, statusFilter, sortDir]
  );

  const handleSortDirToggle = useCallback(() => {
    const newDir: SortDir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(newDir);
    updateUrlParams(searchQuery, projectFilter, statusFilter, sortBy, newDir);
    persistFilters(searchQuery, projectFilter, statusFilter, sortBy, newDir);
  }, [updateUrlParams, persistFilters, searchQuery, projectFilter, statusFilter, sortBy, sortDir]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery(DEFAULT_FILTERS.searchQuery);
    setProjectFilter(DEFAULT_FILTERS.projectFilter);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setSortDir(DEFAULT_FILTERS.sortDir);
    updateUrlParams("", "all", "all", "startTime", "desc");
    setPersistedFilters(DEFAULT_FILTERS);
  }, [updateUrlParams, setPersistedFilters]);

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
      matchesStatusFilter(a, statusFilter) &&
      matchesSearch(a, searchQuery)
  );

  const sorted = sortAgents(filtered, sortBy, sortDir);

  const activeFilterChips: { label: string; onRemove: () => void }[] = [];
  if (searchQuery) {
    activeFilterChips.push({ label: `"${searchQuery}"`, onRemove: () => handleSearchChange("") });
  }
  if (statusFilter !== "all") {
    activeFilterChips.push({
      label: STATUS_FILTER_LABELS[statusFilter] ?? statusFilter,
      onRemove: () => handleStatusChange("all"),
    });
  }
  if (projectFilter !== "all") {
    activeFilterChips.push({ label: projectFilter, onRemove: () => handleProjectChange("all") });
  }

  const handleExport = useCallback(() => {
    const headers = ["Agent Name", "Repo", "Issue", "Status", "Started", "Completed", "Duration", "PR URL", "Files Modified"];
    const rows = agents.map((a) => [
      a.name,
      a.project,
      a.issueNumber ?? "",
      a.status,
      "",
      a.completedAt ?? "",
      a.duration,
      a.prUrl ?? "",
      "",
    ]);
    const csv = buildCSV(headers, rows);
    downloadCSV(`fleet-agents-${todayDateString()}.csv`, csv);
  }, [agents]);

  return (
    <section aria-label="All agents" className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All Agents
        </h2>
        <button
          data-testid="export-agents-csv"
          onClick={handleExport}
          disabled={agents.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        placeholder="Search by name, repo, or issue..."
        resultCount={{ shown: filtered.length, total: agents.length }}
      >
        <div data-testid="agent-list-filters" className="flex flex-wrap gap-3">
          <select
            data-testid="project-filter"
            value={projectFilter}
            onChange={(e) => handleProjectChange(e.target.value)}
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
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
            <option value="failed">Failed</option>
            <option value="timedOut">Timed Out</option>
          </select>

          <div className="flex items-center gap-1">
            <select
              data-testid="sort-by"
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value as SortBy)}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Sort by"
            >
              <option value="startTime">Start Time</option>
              <option value="duration">Duration</option>
              <option value="status">Status</option>
            </select>
            <button
              data-testid="sort-dir-toggle"
              onClick={handleSortDirToggle}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-1.5 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
              aria-label={sortDir === "asc" ? "Sort descending" : "Sort ascending"}
              title={sortDir === "asc" ? "Sort descending" : "Sort ascending"}
            >
              <svg
                className={`h-4 w-4 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </FilterBar>

      {activeFilterChips.length > 0 && (
        <div
          data-testid="active-filter-chips"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          {activeFilterChips.map((chip) => (
            <button
              key={chip.label}
              data-testid="filter-chip"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              {chip.label}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            data-testid="clear-filters"
            onClick={handleClearFilters}
            className="text-xs text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 underline underline-offset-2 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

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
          No agents match your filters.
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
              {sorted.map((agent) => (
                <tr
                  key={agent.key}
                  data-testid="agent-list-row"
                  onClick={() => setSelectedAgent(agent.name)}
                  className="border-b border-gray-200 dark:border-white/[0.06] last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors animate-fadeIn"
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
