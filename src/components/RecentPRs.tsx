"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecentPR } from "@/app/api/prs/route";

const REFRESH_INTERVAL_MS = 30_000;

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

const ciStatusConfig: Record<
  RecentPR["ciStatus"],
  { label: string; className: string }
> = {
  passing: {
    label: "CI Passing",
    className: "bg-green-600/20 text-green-400 border-green-600/30",
  },
  failing: {
    label: "CI Failing",
    className: "bg-red-600/20 text-red-400 border-red-600/30",
  },
  pending: {
    label: "CI Pending",
    className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  },
  unknown: {
    label: "CI Unknown",
    className: "bg-gray-600/20 text-gray-400 border-gray-600/30",
  },
};

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function RecentPRs() {
  const [prs, setPrs] = useState<RecentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Recent PRs</h2>
        <span className="text-xs text-gray-500">Auto-refreshes every 30s</span>
      </div>

      {isLoading && prs.length === 0 ? (
        <div data-testid="prs-loading" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-800"
            />
          ))}
        </div>
      ) : error && prs.length === 0 ? (
        <div
          data-testid="prs-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : prs.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500" data-testid="prs-empty">
          No recent PRs found.
        </p>
      ) : (
        <div
          className="max-h-[32rem] space-y-2 overflow-y-auto pr-1"
          data-testid="prs-list"
        >
          {prs.map((pr) => {
            const statusCfg = statusConfig[pr.status];
            const ciCfg = ciStatusConfig[pr.ciStatus];
            const repoShort = pr.repo.split("/").pop() ?? pr.repo;

            return (
              <div
                key={`${pr.repo}-${pr.number}`}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 p-3"
                data-testid="pr-item"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      #{pr.number} {pr.title}
                    </a>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span data-testid="pr-repo">{repoShort}</span>
                    <span>by {pr.author}</span>
                    <time dateTime={pr.createdAt} data-testid="pr-time">
                      {timeAgo(pr.createdAt)}
                    </time>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
                    data-testid="pr-status-badge"
                  >
                    {statusCfg.label}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ciCfg.className}`}
                    data-testid="pr-ci-badge"
                  >
                    {ciCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
