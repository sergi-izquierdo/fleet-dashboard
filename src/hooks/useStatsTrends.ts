"use client";

import { useState, useEffect } from "react";
import type { StatsTrendsResponse } from "@/app/api/stats/trends/route";

export function useStatsTrends() {
  const [data, setData] = useState<StatsTrendsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrends() {
      try {
        const res = await fetch("/api/stats/trends");
        if (!res.ok) return;
        const json = (await res.json()) as StatsTrendsResponse;
        if (!cancelled) setData(json);
      } catch {
        // Silently ignore — sparklines are non-critical
      }
    }

    void fetchTrends();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
