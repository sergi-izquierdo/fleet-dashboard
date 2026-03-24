"use client";

import { useState, useEffect, useCallback } from "react";

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) {
    return "just now";
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function useRelativeTime(timestamp: Date | string): string {
  const getDate = useCallback(
    () =>
      timestamp instanceof Date ? timestamp : new Date(timestamp),
    [timestamp]
  );

  const [relative, setRelative] = useState(() =>
    formatRelativeTime(getDate())
  );

  useEffect(() => {
    const date = getDate();
    let active = true;

    const update = () => {
      if (active) {
        setRelative(formatRelativeTime(date));
      }
    };

    update();

    const interval = setInterval(update, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [getDate]);

  return relative;
}
