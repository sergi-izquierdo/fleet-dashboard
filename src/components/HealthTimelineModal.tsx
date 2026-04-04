"use client";

import { useEffect, useCallback } from "react";
import type { HealthTimelineEntry, HealthStatus } from "@/types/dashboard";

const STATUS_COLORS: Record<HealthStatus, string> = {
  working: "#22c55e",
  idle: "#eab308",
  error: "#ef4444",
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  working: "Working",
  idle: "Idle",
  error: "Error",
};

interface HealthTimelineModalProps {
  agentName: string;
  timeline: HealthTimelineEntry[];
  onClose: () => void;
}

export function HealthTimelineModal({
  agentName,
  timeline,
  onClose,
}: HealthTimelineModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const barWidth = 100 / timeline.length;

  const statusCounts = timeline.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    },
    {} as Record<HealthStatus, number>,
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      data-testid="health-timeline-modal"
    >
      <div
        className="dashboard-modal-panel mx-4 w-full max-w-2xl rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {agentName} — Health Timeline (24h)
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close timeline"
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

        {/* Full-width timeline bar */}
        <div className="mb-4 overflow-hidden rounded-lg">
          <svg
            width="100%"
            height="48"
            viewBox={`0 0 100 48`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Detailed agent health timeline"
          >
            {timeline.map((entry, i) => (
              <rect
                key={i}
                x={`${i * barWidth}%`}
                y={0}
                width={`${Math.max(barWidth, 0.2)}%`}
                height={48}
                fill={STATUS_COLORS[entry.status]}
                opacity={0.85}
              />
            ))}
          </svg>
        </div>

        {/* Time axis */}
        <div className="mb-6 flex justify-between text-xs text-gray-500 dark:text-white/50">
          <span>{timeline.length > 0 ? formatTime(timeline[0].timestamp) : ""}</span>
          <span>
            {timeline.length > 0
              ? formatTime(timeline[Math.floor(timeline.length / 2)].timestamp)
              : ""}
          </span>
          <span>
            {timeline.length > 0
              ? formatTime(timeline[timeline.length - 1].timestamp)
              : ""}
          </span>
        </div>

        {/* Legend / Summary */}
        <div className="flex gap-6">
          {(["working", "idle", "error"] as HealthStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-sm text-gray-600 dark:text-white/70">
                {STATUS_LABELS[status]}:{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {statusCounts[status] || 0}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
