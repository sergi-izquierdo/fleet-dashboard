"use client";

import { useState, useEffect } from "react";
import MergeQueue from "@/components/MergeQueue";
import RecentPRs from "@/components/RecentPRs";
import PRTrendChart from "@/components/PRTrendChart";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

type FilterStatus = "all" | "open" | "merged" | "closed";

const selectClass =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function PRsPage() {
  const [repos, setRepos] = useState<string[]>([]);
  const [filterRepo, setFilterRepo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/repos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { repos: string[] } | null) => {
        if (!cancelled && data && Array.isArray(data.repos)) {
          setRepos(data.repos);
        }
      })
      .catch(() => {
        // repos filter is non-critical; silently ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Page header + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pull Requests
        </h1>
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="prs-page-filters"
        >
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            className={selectClass}
            data-testid="page-filter-repo"
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
            className={selectClass}
            data-testid="page-filter-status"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Merge Queue — full width at top */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
        <SectionErrorBoundary sectionName="Merge Queue">
          <MergeQueue />
        </SectionErrorBoundary>
      </div>

      {/* Recent PRs — scrollable table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
        <SectionErrorBoundary sectionName="Recent PRs">
          <RecentPRs filterRepo={filterRepo} filterStatus={filterStatus} />
        </SectionErrorBoundary>
      </div>

      {/* PR Trend Chart */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
        <SectionErrorBoundary sectionName="PR Merge Trends">
          <PRTrendChart />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
