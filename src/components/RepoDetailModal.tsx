"use client";

import { useState, useEffect } from "react";
import type { RepoDetailData } from "@/types/issues";
import { Modal } from "@/components/ui/Modal";

interface RepoDetailModalProps {
  repo: string;
  onClose: () => void;
}

const CI_STATUS_STYLES: Record<
  string,
  { dot: string; label: string }
> = {
  passing: { dot: "bg-green-500", label: "Passing" },
  failing: { dot: "bg-red-500", label: "Failing" },
  pending: { dot: "bg-yellow-500", label: "Pending" },
  unknown: { dot: "bg-gray-400", label: "Unknown" },
};

const LABEL_COLORS: Record<string, string> = {
  "agent-local": "bg-gray-400/20 text-gray-700 dark:text-gray-300",
  "agent-working": "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300",
  "agent-cloud": "bg-blue-400/20 text-blue-700 dark:text-blue-300",
  bug: "bg-red-400/20 text-red-700 dark:text-red-300",
  enhancement: "bg-purple-400/20 text-purple-700 dark:text-purple-300",
};

function getLabelStyle(label: string): string {
  return (
    LABEL_COLORS[label] ??
    "bg-gray-400/20 text-gray-700 dark:text-gray-300"
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function RepoDetailModal({ repo, onClose }: RepoDetailModalProps) {
  const [data, setData] = useState<RepoDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await fetch(
          `/api/repo-details?repo=${encodeURIComponent(repo)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch details: ${response.status}`);
        }
        const result: RepoDetailData = await response.json();
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load details"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [repo]);

  const repoShort = repo.split("/").pop() ?? repo;

  return (
    <Modal
      onClose={onClose}
      data-testid="repo-detail-modal"
    >
      <div
        className="mx-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f1117] p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {repoShort}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close detail view"
            data-testid="close-detail-modal"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div data-testid="detail-loading" className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : error ? (
          <div
            data-testid="detail-error"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Open Issues */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Open Issues ({data.openIssues.length})
              </h3>
              {data.openIssues.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No open issues
                </p>
              ) : (
                <ul className="space-y-1.5" data-testid="open-issues-list">
                  {data.openIssues.map((issue) => (
                    <li
                      key={issue.number}
                      className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          #{issue.number} {issue.title}
                        </a>
                        {issue.labels.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {issue.labels.map((label) => (
                              <span
                                key={label}
                                className={`inline-block rounded-full px-2 py-0.5 text-xs ${getLabelStyle(label)}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Open PRs */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Open PRs ({data.openPRs.length})
              </h3>
              {data.openPRs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No open PRs
                </p>
              ) : (
                <ul className="space-y-1.5" data-testid="open-prs-list">
                  {data.openPRs.map((pr) => {
                    const ciStyle = CI_STATUS_STYLES[pr.ciStatus];
                    return (
                      <li
                        key={pr.number}
                        className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
                      >
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              #{pr.number} {pr.title}
                            </a>
                            <span
                              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                              title={`CI: ${ciStyle.label}`}
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${ciStyle.dot}`}
                              />
                              {ciStyle.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            by {pr.author} on {formatDate(pr.createdAt)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Recent Merged PRs */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Recent Activity ({data.recentMergedPRs.length} merged)
              </h3>
              {data.recentMergedPRs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No recently merged PRs
                </p>
              ) : (
                <ul
                  className="space-y-1.5"
                  data-testid="recent-merged-prs-list"
                >
                  {data.recentMergedPRs.map((pr) => (
                    <li
                      key={pr.number}
                      className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-purple-500"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218Z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          #{pr.number} {pr.title}
                        </a>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          merged by {pr.author}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
