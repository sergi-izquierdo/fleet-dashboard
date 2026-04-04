"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { RecentPR, PRGroup, PRGroupKey } from "@/types/prs";
import { timeAgo } from "@/components/RecentPRs";
import { PRActionMenu } from "@/components/PRActionMenu";
import { ToastContainer, showToast } from "@/components/Toast";
import { FilterBar } from "@/components/FilterBar";
import PRPipelineSummary from "@/components/PRPipelineSummary";

const REFRESH_INTERVAL_MS = 30_000;

function isMergedToday(pr: RecentPR): boolean {
  if (pr.status !== "merged") return false;
  const mergedDate = pr.mergedAt ?? pr.createdAt;
  const today = new Date();
  const merged = new Date(mergedDate);
  return (
    merged.getFullYear() === today.getFullYear() &&
    merged.getMonth() === today.getMonth() &&
    merged.getDate() === today.getDate()
  );
}

function groupPRs(prs: RecentPR[]): PRGroup[] {
  const groups: Record<PRGroupKey, RecentPR[]> = {
    "awaiting-ci": [],
    "awaiting-review": [],
    "ready-to-merge": [],
    "merged-today": [],
  };

  for (const pr of prs) {
    if (isMergedToday(pr)) {
      groups["merged-today"].push(pr);
    } else if (pr.status === "open") {
      if (pr.ciStatus === "pending" || pr.ciStatus === "unknown") {
        groups["awaiting-ci"].push(pr);
      } else if (pr.ciStatus === "passing" && pr.reviewStatus === "approved") {
        groups["ready-to-merge"].push(pr);
      } else {
        groups["awaiting-review"].push(pr);
      }
    }
  }

  const groupDefs: Array<{ key: PRGroupKey; label: string }> = [
    { key: "awaiting-ci", label: "Awaiting CI" },
    { key: "awaiting-review", label: "Awaiting Review" },
    { key: "ready-to-merge", label: "Ready to Merge" },
    { key: "merged-today", label: "Merged Today" },
  ];

  return groupDefs.map(({ key, label }) => ({
    key,
    label,
    prs: groups[key],
  }));
}

const ciStatusConfig: Record<
  RecentPR["ciStatus"],
  { label: string; className: string }
> = {
  passing: {
    label: "CI Passing",
    className: "bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/30",
  },
  failing: {
    label: "CI Failing",
    className: "bg-red-600/20 text-red-600 dark:text-red-400 border-red-600/30",
  },
  pending: {
    label: "CI Pending",
    className: "bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30",
  },
  unknown: {
    label: "CI Unknown",
    className: "bg-gray-600/20 text-gray-500 dark:text-gray-400 border-gray-600/30",
  },
};

const reviewStatusConfig: Record<
  NonNullable<RecentPR["reviewStatus"]>,
  { label: string; className: string }
> = {
  approved: {
    label: "Approved",
    className: "bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/30",
  },
  changes_requested: {
    label: "Changes Requested",
    className: "bg-red-600/20 text-red-600 dark:text-red-400 border-red-600/30",
  },
  pending: {
    label: "Review Pending",
    className: "bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30",
  },
  none: {
    label: "No Review",
    className: "bg-gray-600/20 text-gray-500 dark:text-gray-400 border-gray-600/30",
  },
};

const groupHeaderConfig: Record<PRGroupKey, { className: string; countClassName: string }> = {
  "awaiting-ci": {
    className: "text-yellow-600 dark:text-yellow-400",
    countClassName: "bg-yellow-600/20 text-yellow-600 dark:text-yellow-400",
  },
  "awaiting-review": {
    className: "text-blue-600 dark:text-blue-400",
    countClassName: "bg-blue-600/20 text-blue-600 dark:text-blue-400",
  },
  "ready-to-merge": {
    className: "text-green-600 dark:text-green-400",
    countClassName: "bg-green-600/20 text-green-600 dark:text-green-400",
  },
  "merged-today": {
    className: "text-purple-600 dark:text-purple-400",
    countClassName: "bg-purple-600/20 text-purple-600 dark:text-purple-400",
  },
};

function PRCard({
  pr,
  index,
  onMerge,
  onClose,
  actionDisabled,
}: {
  pr: RecentPR;
  index: number;
  onMerge: (pr: RecentPR) => void;
  onClose: (pr: RecentPR) => void;
  actionDisabled: boolean;
}) {
  const ciCfg = ciStatusConfig[pr.ciStatus];
  const repoShort = pr.repo.split("/").pop() ?? pr.repo;
  const reviewCfg = pr.reviewStatus ? reviewStatusConfig[pr.reviewStatus] : null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/80 animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      data-testid="grouped-pr-card"
    >
      <div className="min-w-0 flex-1">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium text-blue-500 dark:text-blue-400 hover:underline block"
        >
          #{pr.number} {pr.title}
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 font-medium bg-gray-200/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300"
            data-testid="pr-repo-badge"
          >
            {repoShort}
          </span>
          <time dateTime={pr.createdAt}>
            {timeAgo(pr.createdAt)}
          </time>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ciCfg.className}`}
          data-testid="grouped-pr-ci-badge"
        >
          {ciCfg.label}
        </span>
        {reviewCfg && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${reviewCfg.className}`}
            data-testid="grouped-pr-review-badge"
          >
            {reviewCfg.label}
          </span>
        )}
        <PRActionMenu
          prNumber={pr.number}
          repo={pr.repo}
          status={pr.status}
          onMerge={() => onMerge(pr)}
          onClose={() => onClose(pr)}
          disabled={actionDisabled}
        />
      </div>
    </div>
  );
}

async function mergePR(repo: string, prNumber: number): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/prs/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo, prNumber, method: "squash" }),
  });
  return res.json() as Promise<{ success: boolean; message?: string; error?: string }>;
}

async function closePR(repo: string, prNumber: number): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/prs/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo, prNumber }),
  });
  return res.json() as Promise<{ success: boolean; message?: string; error?: string }>;
}

function matchesPRSearch(pr: RecentPR, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    pr.title.toLowerCase().includes(q) ||
    String(pr.number).includes(q) ||
    pr.repo.toLowerCase().includes(q)
  );
}

function matchesPRStateFilter(pr: RecentPR, state: string): boolean {
  if (state === "all") return true;
  return pr.status === state;
}

function matchesPRCiFilter(pr: RecentPR, ci: string): boolean {
  if (ci === "all") return true;
  return pr.ciStatus === ci;
}

export default function GroupedPRView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [prs, setPrs] = useState<RecentPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Filter state — initialized from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") ?? "all");
  const [ciFilter, setCiFilter] = useState(searchParams.get("ci") ?? "all");

  const updateUrlParams = useCallback(
    (q: string, state: string, ci: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q); else params.delete("q");
      if (state !== "all") params.set("state", state); else params.delete("state");
      if (ci !== "all") params.set("ci", ci); else params.delete("ci");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      updateUrlParams(value, stateFilter, ciFilter);
    },
    [updateUrlParams, stateFilter, ciFilter]
  );

  const handleStateChange = useCallback(
    (value: string) => {
      setStateFilter(value);
      updateUrlParams(searchQuery, value, ciFilter);
    },
    [updateUrlParams, searchQuery, ciFilter]
  );

  const handleCiChange = useCallback(
    (value: string) => {
      setCiFilter(value);
      updateUrlParams(searchQuery, stateFilter, value);
    },
    [updateUrlParams, searchQuery, stateFilter]
  );

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

  const handleMerge = useCallback(async (pr: RecentPR) => {
    setActionInProgress(true);
    try {
      const result = await mergePR(pr.repo, pr.number);
      if (result.success) {
        showToast({ type: "success", title: "Merge queued", description: result.message });
        await fetchPRs();
      } else {
        showToast({ type: "error", title: "Merge failed", description: result.error });
      }
    } catch {
      showToast({ type: "error", title: "Merge failed", description: "Unexpected error" });
    } finally {
      setActionInProgress(false);
    }
  }, [fetchPRs]);

  const handleClose = useCallback(async (pr: RecentPR) => {
    setActionInProgress(true);
    try {
      const result = await closePR(pr.repo, pr.number);
      if (result.success) {
        showToast({ type: "success", title: "PR closed", description: result.message });
        await fetchPRs();
      } else {
        showToast({ type: "error", title: "Close failed", description: result.error });
      }
    } catch {
      showToast({ type: "error", title: "Close failed", description: "Unexpected error" });
    } finally {
      setActionInProgress(false);
    }
  }, [fetchPRs]);

  useEffect(() => {
    fetchPRs();
    const interval = setInterval(fetchPRs, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchPRs]);

  // Apply filters before grouping
  const filteredPrs = prs.filter(
    (pr) =>
      matchesPRSearch(pr, searchQuery) &&
      matchesPRStateFilter(pr, stateFilter) &&
      matchesPRCiFilter(pr, ciFilter)
  );

  const groups = groupPRs(filteredPrs);
  const mergedTodayCount = groups.find((g) => g.key === "merged-today")?.prs.length ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <ToastContainer />

      <PRPipelineSummary prs={prs} />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        placeholder="Search by title, number, or repo..."
        resultCount={{ shown: filteredPrs.length, total: prs.length }}
      >
        <div data-testid="prs-filters" className="flex flex-wrap gap-3">
          <select
            data-testid="pr-state-filter"
            value={stateFilter}
            onChange={(e) => handleStateChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Filter by state"
          >
            <option value="all">All States</option>
            <option value="open">Open</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>

          <select
            data-testid="pr-ci-filter"
            value={ciFilter}
            onChange={(e) => handleCiChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Filter by CI status"
          >
            <option value="all">All CI</option>
            <option value="passing">Passing</option>
            <option value="failing">Failing</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </FilterBar>

      {/* Merged today counter */}
      <div
        className="inline-flex items-center gap-2 rounded-full border border-purple-600/30 bg-purple-600/10 px-4 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400"
        data-testid="merged-today-counter"
      >
        <span>Merged today:</span>
        <span className="text-lg font-bold" data-testid="merged-today-count">
          {mergedTodayCount}
        </span>
      </div>

      {isLoading && prs.length === 0 ? (
        <div data-testid="grouped-prs-loading" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error && prs.length === 0 ? (
        <div
          data-testid="grouped-prs-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
        >
          {error}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const headerCfg = groupHeaderConfig[group.key];
            return (
              <div
                key={group.key}
                data-testid={`pr-group-${group.key}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2 className={`text-sm font-semibold ${headerCfg.className}`}>
                    {group.label}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${headerCfg.countClassName}`}
                    data-testid={`pr-group-count-${group.key}`}
                  >
                    {group.prs.length}
                  </span>
                </div>
                {group.prs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-2" data-testid={`pr-group-empty-${group.key}`}>
                    No PRs in this group.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.prs.map((pr, index) => (
                      <PRCard
                        key={`${pr.repo}-${pr.number}`}
                        pr={pr}
                        index={index}
                        onMerge={handleMerge}
                        onClose={handleClose}
                        actionDisabled={actionInProgress}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
