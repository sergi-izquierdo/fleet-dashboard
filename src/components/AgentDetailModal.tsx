"use client";

import { useState, useEffect, useCallback } from "react";
import type { Agent } from "@/types/dashboard";

interface AgentDetailModalProps {
  sessionName: string;
  onClose: () => void;
  onViewTerminal?: () => void;
  onKilled?: () => void;
}

const STATUS_LABELS: Record<Agent["status"], string> = {
  working: "Working",
  pr_open: "PR Open",
  review_pending: "Review Pending",
  approved: "Approved",
  merged: "Merged",
  error: "Error",
};

const STATUS_STYLES: Record<
  Agent["status"],
  { dot: string; badge: string }
> = {
  working: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  pr_open: {
    dot: "bg-yellow-500",
    badge:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  review_pending: {
    dot: "bg-orange-500",
    badge:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  approved: {
    dot: "bg-green-500",
    badge:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  merged: {
    dot: "bg-purple-500",
    badge:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  error: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

function extractProject(branch: string): string {
  // Try to extract project/repo identifier from branch name (e.g. feat/issue-42-foo → feat)
  const parts = branch.split("/");
  return parts.length > 1 ? parts[0] : branch;
}

export function AgentDetailModal({
  sessionName,
  onClose,
  onViewTerminal,
  onKilled,
}: AgentDetailModalProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [isKilling, setIsKilling] = useState(false);

  async function handleKill() {
    setIsKilling(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionName)}/kill`, {
        method: "POST",
      });
      if (res.ok) {
        setShowKillConfirm(false);
        onKilled?.();
        onClose();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to kill session");
      }
    } catch {
      setError("Failed to kill session");
    } finally {
      setIsKilling(false);
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    async function fetchAgentData() {
      try {
        const response = await fetch("/api/dashboard?fresh=true");
        if (!response.ok) {
          throw new Error(`Failed to fetch agent data: ${response.status}`);
        }
        const data = await response.json();
        const found: Agent | undefined = Array.isArray(data.agents)
          ? data.agents.find(
              (a: Agent) =>
                a.name === sessionName || a.sessionId === sessionName
            )
          : undefined;
        if (found) {
          setAgent(found);
        } else {
          setError("Agent not found in dashboard data");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load agent details"
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchAgentData();
  }, [sessionName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      data-testid="agent-detail-modal"
    >
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900 p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-lg font-semibold text-gray-900 dark:text-white truncate"
            data-testid="agent-detail-name"
          >
            {sessionName}
          </h2>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close agent detail"
            data-testid="close-agent-detail-modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div data-testid="agent-detail-loading" className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : error ? (
          <div
            data-testid="agent-detail-error"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        ) : agent ? (
          <div className="space-y-4" data-testid="agent-detail-content">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-white/50">
                Status
              </span>
              <span
                data-testid="agent-detail-status"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[agent.status].badge}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_STYLES[agent.status].dot}`}
                  aria-hidden="true"
                />
                {STATUS_LABELS[agent.status]}
              </span>
            </div>

            {/* Issue */}
            <div>
              <span className="text-sm text-gray-500 dark:text-white/50">
                Issue
              </span>
              <div className="mt-1">
                {agent.issue.url ? (
                  <a
                    href={agent.issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="agent-detail-issue-link"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    #{agent.issue.number} {agent.issue.title}
                  </a>
                ) : (
                  <span
                    data-testid="agent-detail-issue-title"
                    className="text-sm text-gray-900 dark:text-white"
                  >
                    {agent.issue.title}
                  </span>
                )}
              </div>
            </div>

            {/* Branch */}
            <div>
              <span className="text-sm text-gray-500 dark:text-white/50">
                Branch
              </span>
              <div className="mt-1">
                <code
                  data-testid="agent-detail-branch"
                  className="rounded bg-gray-100 dark:bg-white/10 px-2 py-1 font-mono text-xs text-gray-900 dark:text-white"
                >
                  {agent.branch}
                </code>
              </div>
            </div>

            {/* Project */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-white/50">
                Project
              </span>
              <span
                data-testid="agent-detail-project"
                className="text-sm text-gray-900 dark:text-white"
              >
                {extractProject(agent.branch)}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-white/50">
                Duration
              </span>
              <span
                data-testid="agent-detail-duration"
                className="text-sm text-gray-900 dark:text-white"
              >
                {agent.timeElapsed}
              </span>
            </div>

            {/* PR Link */}
            {agent.pr && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-white/50">
                  Pull Request
                </span>
                <a
                  href={agent.pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="agent-detail-pr-link"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  PR #{agent.pr.number}
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 border-t border-gray-200 dark:border-white/10 pt-4 space-y-2">
              {onViewTerminal && (
                <button
                  onClick={onViewTerminal}
                  data-testid="agent-detail-terminal-button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
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
                  View Terminal
                </button>
              )}
              {showKillConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-white/60 text-center">
                    Terminate this session? Any unsaved work will be lost.
                  </p>
                  <div className="flex gap-2">
                    <button
                      data-testid="agent-detail-kill-cancel-button"
                      onClick={() => setShowKillConfirm(false)}
                      className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      data-testid="agent-detail-kill-confirm-button"
                      onClick={handleKill}
                      disabled={isKilling}
                      className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isKilling ? "Killing…" : "Confirm Kill"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  data-testid="agent-detail-kill-button"
                  onClick={() => setShowKillConfirm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Kill Session
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
