"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { RecentPR } from "@/types/prs";
import { timeAgo } from "@/components/RecentPRs";

const REFRESH_INTERVAL_MS = 30_000;

const ciStatusConfig: Record<
  RecentPR["ciStatus"],
  { label: string; dot: string; className: string }
> = {
  passing: {
    label: "Passing",
    dot: "bg-green-400",
    className: "bg-green-600/20 text-green-400 border-green-600/30",
  },
  failing: {
    label: "Failing",
    dot: "bg-red-400",
    className: "bg-red-600/20 text-red-400 border-red-600/30",
  },
  pending: {
    label: "Pending",
    dot: "bg-yellow-400",
    className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-gray-400",
    className: "bg-gray-600/20 text-gray-400 border-gray-600/30",
  },
};

const statusConfig: Record<
  RecentPR["status"],
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-green-600/20 text-green-400 border-green-600/30",
  },
  merged: {
    label: "Merged",
    className: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  },
  closed: {
    label: "Closed",
    className: "bg-red-600/20 text-red-400 border-red-600/30",
  },
};

type FilterStatus = "all" | "open" | "merged" | "closed";

export default function MergeQueue() {
  const [prs, setPrs] = useState<RecentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterRepo, setFilterRepo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterAuthor, setFilterAuthor] = useState<string>("all");

  const fetchPRs = useCallback(async () => {
    try {
      const response = await fetch("/api/prs");
      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.status}`);
      }
      const data = await response.json();
      setPrs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PRs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPRs();
    const interval = setInterval(fetchPRs, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchPRs]);

  const repos = useMemo(
    () => [...new Set(prs.map((pr) => pr.repo))].sort(),
    [prs]
  );

  const authors = useMemo(
    () => [...new Set(prs.map((pr) => pr.author))].sort(),
    [prs]
  );

  const filteredPRs = useMemo(() => {
    return prs.filter((pr) => {
      if (filterRepo !== "all" && pr.repo !== filterRepo) return false;
      if (filterStatus !== "all" && pr.status !== filterStatus) return false;
      if (filterAuthor !== "all" && pr.author !== filterAuthor) return false;
      return true;
    });
  }, [prs, filterRepo, filterStatus, filterAuthor]);

  const groupedByRepo = useMemo(() => {
    const groups: Record<string, RecentPR[]> = {};
    for (const pr of filteredPRs) {
      if (!groups[pr.repo]) groups[pr.repo] = [];
      groups[pr.repo].push(pr);
    }
    // Sort PRs within each group: open first, then by creation date desc
    for (const repo of Object.keys(groups)) {
      groups[repo].sort((a, b) => {
        const statusOrder = { open: 0, merged: 1, closed: 2 };
        const sDiff = statusOrder[a.status] - statusOrder[b.status];
        if (sDiff !== 0) return sDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return groups;
  }, [filteredPRs]);

  const conflictCount = filteredPRs.filter((pr) => pr.hasConflicts).length;

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      data-testid="merge-queue"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            PR Merge Queue
          </h2>
          {conflictCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-orange-600/30 bg-orange-600/20 px-2 py-0.5 text-xs font-medium text-orange-400"
              data-testid="conflict-count"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          Auto-refreshes every 30s
        </span>
      </div>

      {/* Filters */}
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        data-testid="merge-queue-filters"
      >
        <select
          value={filterRepo}
          onChange={(e) => setFilterRepo(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="filter-repo"
          aria-label="Filter by repository"
        >
          <option value="all">All repos</option>
          {repos.map((repo) => (
            <option key={repo} value={repo}>
              {repo.split("/").pop()}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="filter-status"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="merged">Merged</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filterAuthor}
          onChange={(e) => setFilterAuthor(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="filter-author"
          aria-label="Filter by author"
        >
          <option value="all">All authors</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading && prs.length === 0 ? (
        <div data-testid="merge-queue-loading" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error && prs.length === 0 ? (
        <div
          data-testid="merge-queue-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : filteredPRs.length === 0 ? (
        <p
          className="py-4 text-center text-sm text-gray-500"
          data-testid="merge-queue-empty"
        >
          No PRs match the current filters.
        </p>
      ) : (
        <div
          className="max-h-[40rem] space-y-5 overflow-y-auto pr-1"
          data-testid="merge-queue-list"
        >
          {Object.entries(groupedByRepo)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([repo, repoPRs]) => {
              const repoShort = repo.split("/").pop() ?? repo;
              const openCount = repoPRs.filter(
                (p) => p.status === "open"
              ).length;

              return (
                <div key={repo} data-testid="repo-group">
                  {/* Repo header */}
                  <div className="mb-2 flex items-center gap-2">
                    <h3
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                      data-testid="repo-group-name"
                    >
                      {repoShort}
                    </h3>
                    <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {openCount} open
                    </span>
                  </div>

                  {/* PR list for this repo */}
                  <div className="space-y-2">
                    {repoPRs.map((pr) => {
                      const ciCfg = ciStatusConfig[pr.ciStatus];
                      const sCfg = statusConfig[pr.status];

                      return (
                        <div
                          key={`${pr.repo}-${pr.number}`}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                            pr.hasConflicts
                              ? "border-orange-500/40 bg-orange-500/5"
                              : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                          }`}
                          data-testid="merge-queue-item"
                        >
                          {/* CI status dot */}
                          <div className="flex shrink-0 flex-col items-center gap-1">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${ciCfg.dot}`}
                              title={`CI ${ciCfg.label}`}
                              data-testid="ci-dot"
                            />
                          </div>

                          {/* PR info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm font-medium text-blue-500 hover:text-blue-400 hover:underline"
                              >
                                #{pr.number} {pr.title}
                              </a>
                              {pr.hasConflicts && (
                                <span
                                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-600/30 bg-orange-600/20 px-2 py-0.5 text-xs font-medium text-orange-400"
                                  data-testid="conflict-badge"
                                  title="This PR has merge conflicts"
                                >
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                    />
                                  </svg>
                                  Conflicts
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>by {pr.author}</span>
                              <time dateTime={pr.createdAt}>
                                {timeAgo(pr.createdAt)}
                              </time>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${sCfg.className}`}
                              data-testid="queue-status-badge"
                            >
                              {sCfg.label}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ciCfg.className}`}
                              data-testid="queue-ci-badge"
                            >
                              CI {ciCfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
