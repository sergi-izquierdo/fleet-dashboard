"use client";

import { useState } from "react";
import type { HealthTimelineEntry } from "@/types/dashboard";
import { useRelativeTime } from "@/hooks/useRelativeTime";
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
  startedAt?: string | Date;
  prUrl?: string;
  healthTimeline?: HealthTimelineEntry[];
  onViewTerminal?: () => void;
}

const statusConfig: Record<
  AgentStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  working: {
    label: "Working",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-600 dark:text-blue-400",
    dotClass: "bg-blue-500 animate-pulse-dot",
  },
  pr_open: {
    label: "PR Open",
    bgClass: "bg-yellow-500/20",
    textClass: "text-yellow-600 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  review_pending: {
    label: "Review Pending",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-600 dark:text-orange-400",
    dotClass: "bg-orange-500",
  },
  approved: {
    label: "Approved",
    bgClass: "bg-green-500/20",
    textClass: "text-green-600 dark:text-green-400",
    dotClass: "bg-green-500",
  },
  merged: {
    label: "Merged",
    bgClass: "bg-purple-500/20",
    textClass: "text-purple-600 dark:text-purple-400",
    dotClass: "bg-purple-500",
  },
  error: {
    label: "Error",
    bgClass: "bg-red-500/20",
    textClass: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
  },
};

export function AgentCard({
  agentName,
  status,
  issueTitle,
  branchName,
  timeElapsed,
  startedAt,
  prUrl,
  healthTimeline,
  onViewTerminal,
}: AgentCardProps) {
  const { label, bgClass, textClass, dotClass } = statusConfig[status];
  const [showTimeline, setShowTimeline] = useState(false);
  const relativeTime = useRelativeTime(startedAt ?? new Date());

  return (
    <>
      <div
        className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 space-y-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:hover:border-white/20 dark:hover:bg-white/[0.07] ${
          onViewTerminal ? "cursor-pointer" : ""
        }`}
        onClick={onViewTerminal}
        role={onViewTerminal ? "button" : undefined}
        tabIndex={onViewTerminal ? 0 : undefined}
        onKeyDown={
          onViewTerminal
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewTerminal();
                }
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {agentName}
          </h3>
          <span
            data-testid="status-badge"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${bgClass} ${textClass}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
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
          <code className="rounded bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 font-mono truncate">
            {branchName}
          </code>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
          <span>{startedAt ? relativeTime : timeElapsed}</span>
          <div className="flex items-center gap-3">
            {onViewTerminal && (
              <span className="text-blue-500 dark:text-blue-400 flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Terminal
              </span>
            )}
            {prUrl ? (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View PR
              </a>
            ) : null}
          </div>
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
