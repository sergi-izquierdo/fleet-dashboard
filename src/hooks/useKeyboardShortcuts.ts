"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface KeyboardShortcutHandlers {
  onCreateIssue: () => void;
  onShowHelp: () => void;
  onCloseModal: () => void;
  onToggleDispatcher: () => void;
}

export const NAVIGATION_SHORTCUTS: Record<string, string> = {
  o: "/",
  a: "/agents",
  p: "/prs",
  q: "/queue",
  c: "/costs",
  s: "/settings",
};

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const router = useRouter();
  const pendingKey = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingKey.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Escape always closes modals
      if (e.key === "Escape") {
        clearPending();
        handlers.onCloseModal();
        return;
      }

      // Ctrl+Shift+P — toggle dispatcher (works even in inputs)
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handlers.onToggleDispatcher();
        return;
      }

      // Skip single-key shortcuts when typing in an input
      if (isInput) return;

      const key = e.key.toLowerCase();

      // Complete two-key sequence: g + <nav key>
      if (pendingKey.current === "g") {
        clearPending();
        const path = NAVIGATION_SHORTCUTS[key];
        if (path !== undefined) {
          e.preventDefault();
          router.push(path);
        }
        return;
      }

      // Start two-key sequence with 'g'
      if (key === "g") {
        e.preventDefault();
        pendingKey.current = "g";
        timeoutRef.current = setTimeout(clearPending, 500);
        return;
      }

      // Single-key shortcuts
      if (key === "n") {
        e.preventDefault();
        handlers.onCreateIssue();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        handlers.onShowHelp();
        return;
      }
    },
    [handlers, router, clearPending],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, [handleKeyDown, clearPending]);
}
