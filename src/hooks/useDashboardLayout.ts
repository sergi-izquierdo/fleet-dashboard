"use client";

import { useState, useCallback } from "react";

export type SectionId =
  | "agents"
  | "timeline"
  | "heatmap"
  | "prs"
  | "trends"
  | "activity";

export const DEFAULT_ORDER: SectionId[] = [
  "agents",
  "prs",
  "timeline",
  "activity",
  "trends",
  "heatmap",
];

const STORAGE_KEY = "fleet-dashboard-layout";

function loadOrder(): SectionId[] {
  if (typeof window === "undefined") return DEFAULT_ORDER;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ORDER;
    const parsed: unknown = JSON.parse(stored);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_ORDER.length &&
      parsed.every((id) => DEFAULT_ORDER.includes(id as SectionId))
    ) {
      return parsed as SectionId[];
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_ORDER;
}

function saveOrder(order: SectionId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

export function useDashboardLayout() {
  const [order, setOrder] = useState<SectionId[]>(loadOrder);

  const reorder = useCallback((newOrder: SectionId[]) => {
    setOrder(newOrder);
    saveOrder(newOrder);
  }, []);

  const resetLayout = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { order, reorder, resetLayout };
}
