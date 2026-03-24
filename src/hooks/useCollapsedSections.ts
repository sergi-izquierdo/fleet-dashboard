"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "fleet-dashboard-collapsed-sections";

const DEFAULT_EXPANDED = new Set(["stats", "agent-sessions"]);

type SectionState = Record<string, boolean>;

function loadState(): SectionState {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SectionState;
      }
    }
  } catch {
    // Ignore
  }
  return {};
}

function saveState(state: SectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function useCollapsedSections() {
  const [state, setState] = useState<SectionState>(loadState);

  const isExpanded = useCallback(
    (sectionId: string): boolean => {
      if (sectionId in state) {
        return state[sectionId];
      }
      return DEFAULT_EXPANDED.has(sectionId);
    },
    [state],
  );

  const toggle = useCallback((sectionId: string) => {
    setState((prev) => {
      const currentExpanded = sectionId in prev ? prev[sectionId] : DEFAULT_EXPANDED.has(sectionId);
      const next = { ...prev, [sectionId]: !currentExpanded };
      saveState(next);
      return next;
    });
  }, []);

  return { isExpanded, toggle };
}
