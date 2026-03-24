"use client";

import { useEffect, useState, useCallback } from "react";
import type { TmuxSession, SessionsResponse } from "@/types/sessions";
import TerminalViewer from "@/components/TerminalViewer";

const STATUS_CONFIG = {
  working: {
    label: "Working",
    dotClass: "bg-green-500",
    badgeClass:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  idle: {
    label: "Idle",
    dotClass: "bg-yellow-500",
    badgeClass:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  stuck: {
    label: "Stuck",
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
} as const;

function StatusBadge({ status }: { status: TmuxSession["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      data-testid="session-status-badge"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${config.badgeClass}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.dotClass} ${status === "working" ? "animate-pulse-dot" : ""}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      data-testid="skeleton-card"
      className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 animate-shimmer"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function AgentStatusCards() {
  const [sessions, setSessions] = useState<TmuxSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: SessionsResponse = await res.json();
      if (data.error) {
        setError(data.error);
        setSessions(data.sessions ?? []);
      } else {
        setError(null);
        setSessions(data.sessions ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  if (isLoading) {
    return (
      <section aria-label="Agent sessions loading">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Agent Sessions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <section aria-label="Agent sessions">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Agent Sessions
        </h2>
        <div
          data-testid="sessions-error"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-500 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      </section>
    );
  }

  if (sessions.length === 0) {
    return (
      <section aria-label="Agent sessions">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Agent Sessions
        </h2>
        <div
          data-testid="sessions-empty"
          className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center dark:border-white/10 dark:bg-white/5"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
            <svg className="h-6 w-6 text-gray-400 dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015.75 4.5h-9A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">No active agents</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-white/50">Create issues with the <code className="rounded bg-gray-100 dark:bg-white/10 px-1 py-0.5 font-mono text-xs">agent-local</code> label to start work</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Agent sessions" className="animate-fade-in">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Agent Sessions
      </h2>
      {error && (
        <div
          data-testid="sessions-warning"
          className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-600 dark:text-yellow-400"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {sessions.map((session) => (
          <button
            key={session.name}
            data-testid="session-card"
            onClick={() => setSelectedSession(session.name)}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/[0.07] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3
                className="truncate text-sm font-semibold text-gray-900 dark:text-white"
                title={session.name}
              >
                {session.name}
              </h3>
              <StatusBadge status={session.status} />
            </div>
            {session.taskName !== "unknown" && (
              <p
                data-testid="session-task-name"
                className="mt-2 truncate text-xs text-gray-600 dark:text-white/60"
                title={session.taskName}
              >
                {session.taskName}
              </p>
            )}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 3v12m0 0a3 3 0 103 3V9a3 3 0 10-3 3m12-6v6m0 0a3 3 0 103 3V9a3 3 0 10-3-3"
                  />
                </svg>
                <span data-testid="session-branch" className="truncate" title={session.branch}>
                  {session.branch}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span data-testid="session-uptime">{session.uptime}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
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
              <span>View terminal</span>
            </div>
          </button>
        ))}
      </div>

      {selectedSession && (
        <TerminalViewer
          sessionName={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </section>
  );
}
