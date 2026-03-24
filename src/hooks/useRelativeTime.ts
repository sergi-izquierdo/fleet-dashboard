"use client";

import { useState, useEffect } from "react";
import { getRelativeTime } from "@/lib/relativeTime";

const UPDATE_INTERVAL_MS = 30_000;

/**
 * Forces a re-render tick every 30 seconds so that components
 * calling getRelativeTime inline will show updated values.
 */
export function useRelativeTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return tick;
}

/**
 * Returns a relative time string for the given ISO timestamp,
 * auto-updating every 30 seconds.
 */
export function useRelativeTime(isoString: string): string {
  useRelativeTick();
  return getRelativeTime(isoString);
}
