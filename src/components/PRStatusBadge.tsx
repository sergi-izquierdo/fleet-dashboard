import React from "react";

export type CIStatus = "passing" | "failing" | "pending";
export type ReviewStatus = "approved" | "changes_requested" | "pending";
export type MergeState = "merged" | "open" | "closed";

export interface PRStatusBadgeProps {
  prNumber: number;
  repoUrl: string;
  ciStatus: CIStatus;
  reviewStatus: ReviewStatus;
  mergeState: MergeState;
}

const ciStatusConfig: Record<CIStatus, { label: string; className: string }> = {
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
};

const reviewStatusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  approved: {
    label: "Approved",
    className: "bg-green-600/20 text-green-400 border-green-600/30",
  },
  changes_requested: {
    label: "Changes Requested",
    className: "bg-red-600/20 text-red-400 border-red-600/30",
  },
  pending: {
    label: "Review Pending",
    className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  },
};

const mergeStateConfig: Record<MergeState, { label: string; className: string }> = {
  merged: {
    label: "Merged",
    className: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  },
  open: {
    label: "Open",
    className: "bg-green-600/20 text-green-400 border-green-600/30",
  },
  closed: {
    label: "Closed",
    className: "bg-red-600/20 text-red-400 border-red-600/30",
  },
};

export function PRStatusBadge({
  prNumber,
  repoUrl,
  ciStatus,
  reviewStatus,
  mergeState,
}: PRStatusBadgeProps) {
  const prUrl = `${repoUrl}/pull/${prNumber}`;
  const ci = ciStatusConfig[ciStatus];
  const review = reviewStatusConfig[reviewStatus];
  const merge = mergeStateConfig[mergeState];

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm">
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
      >
        #{prNumber}
      </a>

      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ci.className}`}
      >
        {ci.label}
      </span>

      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${review.className}`}
      >
        {review.label}
      </span>

      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${merge.className}`}
      >
        {merge.label}
      </span>
    </div>
  );
}
