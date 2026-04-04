"use client";

import { useState, useEffect } from "react";
import type { StatsComparisonResponse } from "@/app/api/stats/comparison/route";

export function useStatsComparison(period: "7d" | "24h" = "7d") {
  const [data, setData] = useState<StatsComparisonResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchComparison() {
      try {
        const res = await fetch(`/api/stats/comparison?period=${period}`);
        if (!res.ok) return;
        const json = (await res.json()) as unknown;
        // Validate the response has the expected shape before setting state
        if (
          json !== null &&
          typeof json === "object" &&
          "current" in json &&
          "previous" in json &&
          "deltas" in json
        ) {
          if (!cancelled) setData(json as StatsComparisonResponse);
        }
      } catch {
        // Silently ignore — trend indicators are non-critical
      }
    }

    void fetchComparison();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return data;
}
