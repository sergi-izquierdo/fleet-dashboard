"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LogsResponse {
  sessionName: string;
  lines: string[];
  error?: string;
}

interface AgentLogViewerProps {
  sessionName: string;
}

export function AgentLogViewer({ sessionName }: AgentLogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionName)}/logs`
      );
      const data: LogsResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to fetch logs");
        setLines([]);
      } else {
        setLines(data.lines);
      }
    } catch {
      setError("Network error");
      setLines([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionName]);

  useEffect(() => {
    if (isExpanded) {
      fetchLogs();
    }
  }, [isExpanded, fetchLogs]);

  useEffect(() => {
    if (preRef.current && !isLoading) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [lines, isLoading]);

  return (
    <div data-testid="agent-log-viewer">
      <button
        data-testid="agent-log-viewer-toggle"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-sm text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
        aria-expanded={isExpanded}
      >
        <span>View Logs</span>
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2" data-testid="agent-log-viewer-content">
          <div className="flex justify-end mb-1">
            <button
              data-testid="agent-log-viewer-refresh"
              onClick={fetchLogs}
              disabled={isLoading}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Refresh logs"
            >
              <svg
                className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>

          {error ? (
            <div
              data-testid="agent-log-viewer-error"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
              {error}
            </div>
          ) : (
            <pre
              ref={preRef}
              data-testid="agent-log-viewer-pre"
              className="max-h-48 overflow-y-auto rounded-lg bg-gray-950 dark:bg-black/50 p-3 font-mono text-xs text-gray-100 whitespace-pre-wrap break-all"
            >
              {isLoading && lines.length === 0
                ? "Loading…"
                : lines.length === 0
                  ? "(no output)"
                  : lines.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
