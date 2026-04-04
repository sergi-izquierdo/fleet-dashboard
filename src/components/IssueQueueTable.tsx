"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, X, ExternalLink, Inbox } from "lucide-react";
import type { QueueIssue } from "@/app/api/issues/queue/route";
import { showToast } from "@/components/Toast";

const REFRESH_INTERVAL_MS = 30_000;

function RepoBadge({ repo }: { repo: string }) {
  const name = repo.split("/")[1] ?? repo;
  return (
    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
      {name}
    </span>
  );
}

function LabelBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/50">
      {label}
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? "just now" : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export default function IssueQueueTable() {
  const [issues, setIssues] = useState<QueueIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/issues/queue");
      if (!res.ok) throw new Error("Failed to fetch queue");
      const data: { issues: QueueIssue[] } = await res.json();
      setIssues(data.issues);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
    const interval = setInterval(() => void fetchQueue(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function handleRemove(issue: QueueIssue) {
    const key = `remove-${issue.repo}-${issue.number}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/issues/queue/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: issue.repo, issueNumber: issue.number }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to remove from queue");
      setIssues((prev) => prev.filter((i) => !(i.repo === issue.repo && i.number === issue.number)));
      showToast({ type: "success", title: `Removed #${issue.number} from queue` });
    } catch (err) {
      showToast({ type: "error", title: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleBoost(issue: QueueIssue) {
    const key = `boost-${issue.repo}-${issue.number}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/issues/queue/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: issue.repo, issueNumber: issue.number }),
      });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to boost priority");
      showToast({ type: "success", title: `Boosted priority for #${issue.number}` });
    } catch (err) {
      showToast({ type: "error", title: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm">
        Loading queue...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-400/70 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Inbox className="h-10 w-10 text-white/10" />
          <p className="text-sm text-white/30">No issues in queue</p>
          <p className="text-xs text-white/20">Issues with the agent-local label will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wide text-white/30">Repo</th>
                <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wide text-white/30">#</th>
                <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wide text-white/30">Title</th>
                <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wide text-white/30">Created</th>
                <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wide text-white/30">Labels</th>
                <th className="pb-3 text-[11px] font-medium uppercase tracking-wide text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {issues.map((issue) => {
                const removeKey = `remove-${issue.repo}-${issue.number}`;
                const boostKey = `boost-${issue.repo}-${issue.number}`;
                return (
                  <tr key={`${issue.repo}-${issue.number}`} className="group hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 align-top">
                      <RepoBadge repo={issue.repo} />
                    </td>
                    <td className="py-3 pr-4 align-top text-white/40">
                      #{issue.number}
                    </td>
                    <td className="py-3 pr-4 align-top max-w-xs">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors group/link"
                      >
                        <span className="line-clamp-2">{issue.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-white/20 group-hover/link:text-white/40" />
                      </a>
                    </td>
                    <td className="py-3 pr-4 align-top whitespace-nowrap text-white/30 text-[12px]">
                      {formatRelativeTime(issue.createdAt)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <LabelBadge key={label} label={label} />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleBoost(issue)}
                          disabled={!!actionLoading[boostKey]}
                          title="Boost priority (adds priority: high comment)"
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Zap className="h-3 w-3" />
                          Boost
                        </button>
                        <button
                          onClick={() => void handleRemove(issue)}
                          disabled={!!actionLoading[removeKey]}
                          title="Remove from queue (removes agent-local label)"
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-white/20 text-right">
            {issues.length} issue{issues.length !== 1 ? "s" : ""} · auto-refreshes every 30s
          </p>
        </div>
      )}
    </div>
  );
}
