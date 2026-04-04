"use client";

import { useEffect, useState, useCallback } from "react";

interface DispatcherToggleState {
  paused: boolean;
  loading: boolean;
  error: string | null;
}

export function DispatcherToggle() {
  const [state, setState] = useState<DispatcherToggleState>({
    paused: false,
    loading: true,
    error: null,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatcher/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = (await res.json()) as { paused: boolean };
      setState({ paused: data.paused, loading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: "Unavailable" }));
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handlePause() {
    setConfirmOpen(false);
    setActionLoading(true);
    try {
      const res = await fetch("/api/dispatcher/pause", { method: "POST" });
      if (!res.ok) throw new Error("Pause failed");
      setState({ paused: true, loading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, error: "Pause failed" }));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/dispatcher/resume", { method: "POST" });
      if (!res.ok) throw new Error("Resume failed");
      setState({ paused: false, loading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, error: "Resume failed" }));
    } finally {
      setActionLoading(false);
    }
  }

  if (state.loading) {
    return (
      <div className="flex h-8 items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        <span className="ml-1.5 text-xs text-white/30">Dispatcher</span>
      </div>
    );
  }

  return (
    <>
      {state.paused ? (
        <button
          onClick={() => void handleResume()}
          disabled={actionLoading}
          className="flex h-8 items-center gap-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          aria-label="Dispatcher paused — click to resume"
          title="Dispatcher paused — click to resume"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          <span className="hidden sm:inline">Paused</span>
        </button>
      ) : (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={actionLoading}
          className="flex h-8 items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-2.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
          aria-label="Dispatcher running — click to pause"
          title="Dispatcher running — click to pause"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="hidden sm:inline">Running</span>
        </button>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-dialog-title"
        >
          <div className="dashboard-modal-panel mx-4 w-full max-w-sm rounded-xl p-6 shadow-2xl">
            <h2
              id="pause-dialog-title"
              className="text-sm font-semibold text-white/90"
            >
              Pause Dispatcher?
            </h2>
            <p className="mt-2 text-xs text-white/50">
              Agents in progress will finish, but no new agents will spawn.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handlePause()}
                className="rounded-md bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/30 transition-colors"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
