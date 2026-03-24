"use client";

import { useState, useEffect, useCallback } from "react";
import type { FleetIssueProgress, RepoIssueProgress } from "@/types/issues";
import { RepoDetailModal } from "./RepoDetailModal";

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

function RepoProgressCard({
  repo,
  onSelect,
}: {
  repo: RepoIssueProgress;
  onSelect: (repoName: string) => void;
}) {
  const repoShort = repo.repo.split("/").pop() ?? repo.repo;

  return (
    <button
      type="button"
      className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 cursor-pointer transition-colors hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
      data-testid="repo-progress"
      onClick={() => onSelect(repo.repo)}
      aria-label={`View details for ${repoShort}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {repoShort}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {repo.percentComplete}%
          </span>
          <svg
            className="h-4 w-4 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <ProgressBar labels={repo.labels} total={repo.total} />
      <div className="mt-2 flex items-center justify-between">
        <LabelLegend labels={repo.labels} />
        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {repo.closed}/{repo.total} issues
        </span>
      </div>
    </button>
  );
}

export default function ProgressTracker() {
  const [progress, setProgress] = useState<FleetIssueProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

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

      {isLoading && !progress ? (
        <div data-testid="progress-loading" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error && !progress ? (
        <div
          data-testid="progress-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : progress ? (
        <div className="space-y-4">
          {/* Overall Fleet Progress */}
          <div
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
            data-testid="overall-progress"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Overall Fleet Progress
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {progress.overall.percentComplete}%
              </span>
            </div>
            <ProgressBar
              labels={progress.overall.labels}
              total={progress.overall.total}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <LabelLegend labels={progress.overall.labels} />
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {progress.overall.closed}/{progress.overall.total} issues
                closed
              </span>
            </div>
          </div>

          {/* Per-Repo Progress */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progress.repos.map((repo) => (
              <RepoProgressCard
                key={repo.repo}
                repo={repo}
                onSelect={setSelectedRepo}
              />
            ))}
          </div>
        </div>
      ) : null}

      {selectedRepo && (
        <RepoDetailModal
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </div>
  );
}
