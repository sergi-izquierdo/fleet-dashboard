"use client";

import { useState, useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";

const REFRESH_INTERVAL = 30;
const STORAGE_KEY = "autoRefreshPaused";

interface AutoRefreshIndicatorProps {
  onRefresh: () => void;
}

export default function AutoRefreshIndicator({
  onRefresh,
}: AutoRefreshIndicatorProps) {
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const timeout = setTimeout(() => {
      onRefreshRef.current();
      setCountdown(REFRESH_INTERVAL);
      setRefreshKey((k) => k + 1);
    }, REFRESH_INTERVAL * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPaused, refreshKey]);

  const handleTogglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    if (!next) {
      setCountdown(REFRESH_INTERVAL);
    }
  };

  const handleRefreshClick = () => {
    onRefreshRef.current();
    setCountdown(REFRESH_INTERVAL);
    setRefreshKey((k) => k + 1);
  };

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / REFRESH_INTERVAL;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="auto-refresh-indicator"
    >
      {isPaused ? (
        <span
          className="text-xs text-gray-400 dark:text-white/40"
          data-testid="paused-label"
        >
          Paused
        </span>
      ) : (
        <button
          onClick={handleRefreshClick}
          title={`Refresh now (${countdown}s)`}
          aria-label={`Auto-refresh in ${countdown} seconds. Click to refresh now.`}
          data-testid="countdown-button"
          className="text-gray-500 dark:text-white/50 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            data-testid="countdown-svg"
          >
            <circle
              cx="13"
              cy="13"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-200 dark:text-white/10"
              opacity="0.4"
            />
            <circle
              cx="13"
              cy="13"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 13 13)"
              className="text-blue-500 dark:text-blue-400"
            />
            <text
              x="13"
              y="17"
              textAnchor="middle"
              fontSize="7"
              fill="currentColor"
              data-testid="countdown-text"
            >
              {countdown}
            </text>
          </svg>
        </button>
      )}

      <button
        onClick={handleTogglePause}
        title={isPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
        aria-label={isPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
        data-testid="pause-resume-button"
        className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
      >
        {isPaused ? (
          <Play className="w-3.5 h-3.5" />
        ) : (
          <Pause className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
