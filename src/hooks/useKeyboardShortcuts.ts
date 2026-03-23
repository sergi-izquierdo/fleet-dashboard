"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcutHandlers {
  onToggleCommandPalette: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd/Ctrl+K — always opens palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handlers.onToggleCommandPalette();
        return;
      }

      // Skip single-key shortcuts when typing in an input
      if (isInput) return;

      switch (e.key.toLowerCase()) {
        case "r":
          e.preventDefault();
          handlers.onRefresh();
          break;
        case "t":
          e.preventDefault();
          handlers.onToggleTheme();
          break;
      }
    },
    [handlers],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
