"use client";

import { useState } from "react";
import type { HealthTimelineEntry } from "@/types/dashboard";
import { HealthSparkline } from "./HealthSparkline";
import { HealthTimelineModal } from "./HealthTimelineModal";

export type AgentStatus =
  | "working"
  | "pr_open"
  | "review_pending"
  | "approved"
  | "merged"
  | "error";

export interface AgentCardProps {
  agentName: string;
  status: AgentStatus;
  issueTitle: string;
  branchName: string;
  timeElapsed: string;
  prUrl?: string;
  healthTimeline?: HealthTimelineEntry[];
}

const statusConfig: Record<
  AgentStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  working: {
    label: "Working",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-400",
  },
  pr_open: {
    label: "PR Open",
    bgClass: "bg-yellow-500/20",
    textClass: "text-yellow-400",
  },
  review_pending: {
    label: "Review Pending",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-400",
  },
  approved: {
    label: "Approved",
    bgClass: "bg-green-500/20",
    textClass: "text-green-400",
  },
  merged: {
    label: "Merged",
    bgClass: "bg-purple-500/20",
    textClass: "text-purple-400",
  },
  error: {
    label: "Error",
    bgClass: "bg-red-500/20",
    textClass: "text-red-400",
  },
};

export function AgentCard({
  agentName,
  status,
  issueTitle,
  branchName,
  timeElapsed,
  prUrl,
  healthTimeline,
}: AgentCardProps) {
  const { label, bgClass, textClass } = statusConfig[status];
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {agentName}
          </h3>
          <span
            data-testid="status-badge"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}
          >
            {label}
          </span>
        </div>

        {healthTimeline && healthTimeline.length > 0 && (
          <HealthSparkline
            timeline={healthTimeline}
            onClick={() => setShowTimeline(true)}
          />
        )}

        <p className="text-sm text-gray-600 dark:text-white/70 truncate" title={issueTitle}>
          {issueTitle}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
          <code className="rounded bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 font-mono truncate">
            {branchName}
          </code>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
          <span>{timeElapsed}</span>
          {prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              View PR
            </a>
          ) : null}
        </div>
      </div>

      {showTimeline && healthTimeline && (
        <HealthTimelineModal
          agentName={agentName}
          timeline={healthTimeline}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </>
  );
}
