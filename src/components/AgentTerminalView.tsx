"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface AgentTerminalViewProps {
  sessionName: string;
  agentStatus?: string;
  timeElapsed?: string;
}

interface TerminalSSEData {
  lines?: string[];
  sessionName?: string;
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const colors = {
    connected: "bg-green-500",
    reconnecting: "bg-yellow-500 animate-pulse",
    disconnected: "bg-red-500",
  };
  const labels = {
    connected: "Connected",
    reconnecting: "Reconnecting…",
    disconnected: "Disconnected",
  };
  return (
    <div className="flex items-center gap-1.5" data-testid="connection-status">
      <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-gray-400">{labels[status]}</span>
    </div>
  );
}

export function AgentTerminalView({
  sessionName,
  agentStatus,
  timeElapsed,
}: AgentTerminalViewProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1_000);
  const mountedRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    setUserScrolledUp(false);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 32;
    setUserScrolledUp(!atBottom);
  }, []);

  useEffect(() => {
    if (!userScrolledUp && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, userScrolledUp]);

  // Initial fetch
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionName)}/terminal`
        );
        const data = (await res.json()) as {
          lines: string[];
          active: boolean;
          error?: string;
        };
        if (!mountedRef.current) return;
        if (res.status === 404 || (data.error && !data.active)) {
          setIsEmpty(true);
        } else {
          setLines(data.lines ?? []);
        }
      } catch {
        if (mountedRef.current) setIsEmpty(true);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }
    fetchInitial();
  }, [sessionName]);

  // SSE stream
  const connect = useCallback(() => {
    if (!mountedRef.current || !autoRefresh) return;

    const url = `/api/sessions/${encodeURIComponent(sessionName)}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      if (!mountedRef.current) return;
      setConnectionStatus("connected");
      backoffRef.current = 1_000;
    });

    es.addEventListener("lines", (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const payload = JSON.parse(e.data as string) as TerminalSSEData;
        if (Array.isArray(payload.lines)) {
          setLines(payload.lines);
          setIsEmpty(false);
          setIsLoading(false);
        }
      } catch {
        // ignore malformed events
      }
    });

    es.addEventListener("session-ended", () => {
      if (!mountedRef.current) return;
      setConnectionStatus("disconnected");
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      if (!mountedRef.current) return;
      setConnectionStatus("reconnecting");

      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [sessionName, autoRefresh]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoRefresh) {
      connect();
    } else {
      setConnectionStatus("disconnected");
    }
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, autoRefresh]);

  function handleManualRefresh() {
    fetch(`/api/sessions/${encodeURIComponent(sessionName)}/terminal`)
      .then((res) => res.json())
      .then((data: { lines: string[]; active: boolean }) => {
        if (mountedRef.current) setLines(data.lines ?? []);
      })
      .catch(() => undefined);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div
      className="flex flex-col w-full"
      style={{ background: "#1a1b26" }}
      data-testid="agent-terminal-view"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-green-400 dark:text-green-400">
            {sessionName}
          </span>
          {agentStatus && (
            <span className="text-xs text-gray-500">{agentStatus}</span>
          )}
          {timeElapsed && (
            <span className="text-xs text-gray-500">{timeElapsed}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator status={connectionStatus} />
          <button
            onClick={handleCopy}
            data-testid="copy-terminal-button"
            title="Copy to clipboard"
            className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleManualRefresh}
            data-testid="refresh-terminal-button"
            title="Refresh"
            className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Refresh
          </button>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              data-testid="auto-refresh-toggle"
              className="accent-green-500"
            />
            <span className="text-xs text-gray-400">Auto</span>
          </label>
        </div>
      </div>

      {/* Terminal body */}
      <div className="relative flex-1 min-h-0">
        {isLoading ? (
          <div
            data-testid="terminal-loading"
            className="space-y-2 p-4"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-white/5"
                style={{ width: `${60 + (i % 3) * 15}%` }}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div
            data-testid="terminal-empty"
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="text-3xl mb-3">🖥️</span>
            <p className="text-gray-500 text-sm">Session not found</p>
            <p className="text-gray-600 text-xs mt-1">
              {sessionName} may have ended or not started yet
            </p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-testid="terminal-output"
            className="h-full overflow-y-auto p-4 font-mono text-sm leading-relaxed"
            style={{ maxHeight: "60vh" }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-all"
                style={{ color: "#9ece6a" }}
              >
                {line || "\u00a0"}
              </div>
            ))}
          </div>
        )}

        {/* Scroll to bottom FAB */}
        {userScrolledUp && !isLoading && !isEmpty && (
          <button
            onClick={scrollToBottom}
            data-testid="scroll-to-bottom"
            className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-green-500 transition-colors"
          >
            ↓ Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
}
