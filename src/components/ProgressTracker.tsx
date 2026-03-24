"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FleetIssueProgress, RepoIssueProgress } from "@/types/issues";

const REFRESH_INTERVAL_MS = 30_000;

function ProgressBar({
  labels,
  total,
}: {
  labels: RepoIssueProgress["labels"];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
    );
  }

  const segments = [
    { count: labels.done, color: "bg-green-500", label: "Done" },
    { count: labels.inProgress, color: "bg-yellow-500", label: "In Progress" },
    { count: labels.cloud, color: "bg-blue-500", label: "Cloud" },
    { count: labels.queued, color: "bg-gray-400", label: "Queued" },
  ];

  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      role="progressbar"
      aria-valuenow={labels.done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {segments.map(
        (seg) =>
          seg.count > 0 && (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-500`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${seg.label}: ${seg.count}`}
              data-testid={`bar-${seg.label.toLowerCase().replace(" ", "-")}`}
            />
          )
      )}
    </div>
  );
}

function LabelLegend({ labels }: { labels: RepoIssueProgress["labels"] }) {
  const items = [
    { label: "Done", count: labels.done, color: "bg-green-500" },
    {
      label: "In Progress",
      count: labels.inProgress,
      color: "bg-yellow-500",
    },
    { label: "Cloud", count: labels.cloud, color: "bg-blue-500" },
    { label: "Queued", count: labels.queued, color: "bg-gray-400" },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`}
          />
          {item.label}: {item.count}
        </span>
      ))}
    </div>
  );
}

function RepoProgressCard({ repo }: { repo: RepoIssueProgress }) {
  const repoShort = repo.repo.split("/").pop() ?? repo.repo;

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
      data-testid="repo-progress"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {repoShort}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {repo.percentComplete}%
        </span>
      </div>
      <ProgressBar labels={repo.labels} total={repo.total} />
      <div className="mt-2 flex items-center justify-between">
        <LabelLegend labels={repo.labels} />
        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {repo.closed}/{repo.total} issues
        </span>
      </div>
    </div>
  );
}

interface ProgressTrackerProps {
  selectedProject?: string;
}

export default function ProgressTracker({ selectedProject = "all" }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<FleetIssueProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/issues");
      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.status}`);
      }
      const data: FleetIssueProgress = await response.json();
      setProgress(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load progress"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  const filteredProgress = useMemo((): FleetIssueProgress | null => {
    if (!progress) return null;
    if (selectedProject === "all") return progress;

    const filteredRepos = progress.repos.filter(
      (repo) => repo.repo === selectedProject
    );
    const overall = filteredRepos.reduce(
      (acc, repo) => ({
        total: acc.total + repo.total,
        open: acc.open + repo.open,
        closed: acc.closed + repo.closed,
        percentComplete: 0,
        labels: {
          queued: acc.labels.queued + repo.labels.queued,
          inProgress: acc.labels.inProgress + repo.labels.inProgress,
          cloud: acc.labels.cloud + repo.labels.cloud,
          done: acc.labels.done + repo.labels.done,
        },
      }),
      {
        total: 0,
        open: 0,
        closed: 0,
        percentComplete: 0,
        labels: { queued: 0, inProgress: 0, cloud: 0, done: 0 },
      }
    );
    overall.percentComplete =
      overall.total > 0 ? Math.round((overall.closed / overall.total) * 100) : 0;

    return { repos: filteredRepos, overall };
  }, [progress, selectedProject]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Issue Progress
        </h2>
        <span className="text-xs text-gray-500">
          Auto-refreshes every 30s
        </span>
      </div>

      {isLoading && !filteredProgress ? (
        <div data-testid="progress-loading" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error && !filteredProgress ? (
        <div
          data-testid="progress-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : filteredProgress ? (
        <div className="space-y-4">
          {/* Overall Fleet Progress */}
          <div
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
            data-testid="overall-progress"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedProject === "all" ? "Overall Fleet Progress" : "Project Progress"}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {filteredProgress.overall.percentComplete}%
              </span>
            </div>
            <ProgressBar
              labels={filteredProgress.overall.labels}
              total={filteredProgress.overall.total}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <LabelLegend labels={filteredProgress.overall.labels} />
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {filteredProgress.overall.closed}/{filteredProgress.overall.total} issues
                closed
              </span>
            </div>
          </div>

          {/* Per-Repo Progress */}
          {filteredProgress.repos.length > 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredProgress.repos.map((repo) => (
                <RepoProgressCard key={repo.repo} repo={repo} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
