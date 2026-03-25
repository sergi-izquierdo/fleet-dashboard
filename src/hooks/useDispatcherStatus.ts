"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DispatcherStatusResponse } from "@/app/api/dispatcher-status/route";

const POLL_INTERVAL_MS = 30_000;

export interface UseDispatcherStatusReturn {
  data: DispatcherStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  countdown: number;
}

export function useDispatcherStatus(): UseDispatcherStatusReturn {
  const [data, setData] = useState<DispatcherStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatcher-status");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: DispatcherStatusResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch dispatcher status";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetCountdown = useCallback(() => {
    setCountdown(POLL_INTERVAL_MS / 1000);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  }, []);

  useEffect(() => {
    fetchStatus();
    resetCountdown();

    timerRef.current = setInterval(() => {
      fetchStatus();
      resetCountdown();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchStatus, resetCountdown]);

  return { data, isLoading, error, countdown };
}
