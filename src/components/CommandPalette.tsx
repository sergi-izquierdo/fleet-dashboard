"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { fuzzyMatch } from "@/lib/fuzzyMatch";
import type { DashboardData } from "@/types/dashboard";

export interface CommandItem {
  id: string;
  label: string;
  category: "action" | "agent" | "pr" | "navigation";
  shortcut?: string;
  icon: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

/**
 * Outer shell — renders nothing when closed. The inner component
 * remounts each time via the `instanceKey` prop which the parent
 * should increment on each open.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!mounted || !open) return null;
  return <CommandPaletteInner onClose={onClose} items={items} />;
}

const categoryLabels: Record<CommandItem["category"], string> = {
  action: "Actions",
  agent: "Agents",
  pr: "Pull Requests",
  navigation: "Navigation",
};

function CommandPaletteInner({
  onClose,
  items,
}: {
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((item) => {
        const match = fuzzyMatch(query, item.label);
        return match ? { item, score: match.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map((r) => r!.item);
  }, [query, items]);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView?.({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            filtered[selectedIndex].onSelect();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, onClose],
  );

  // Group items by category while preserving order
  const grouped: { category: CommandItem["category"]; items: CommandItem[] }[] =
    [];
  const seen = new Set<string>();
  for (const item of filtered) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      grouped.push({
        category: item.category,
        items: filtered.filter((i) => i.category === item.category),
      });
    }
  }

  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 px-4 py-3">
          <svg
            className="h-5 w-5 shrink-0 text-gray-400 dark:text-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="hidden sm:inline-flex rounded border border-gray-200 dark:border-white/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-white/40">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto py-2"
          role="listbox"
          data-testid="command-palette-results"
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-white/50">
              No results found
            </p>
          ) : (
            grouped.map((group) => {
              const groupItems = group.items;
              const startIndex = runningIndex;
              runningIndex += groupItems.length;

              return (
                <div key={group.category}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                    {categoryLabels[group.category]}
                  </div>
                  {groupItems.map((item, i) => {
                    const globalIndex = startIndex + i;
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                            : "text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        data-testid={`command-item-${item.id}`}
                      >
                        <span className="text-base" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.shortcut && (
                          <kbd className="rounded border border-gray-200 dark:border-white/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-white/40">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-200 dark:border-white/10 px-4 py-2 text-[10px] text-gray-400 dark:text-white/30">
          <span>
            <kbd className="font-medium">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-medium">↵</kbd> select
          </span>
          <span>
            <kbd className="font-medium">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Builds the command items list from dashboard data and action handlers.
 */
export function buildCommandItems(
  data: DashboardData | null,
  actions: {
    refresh: () => void;
    toggleTheme: () => void;
    scrollToSection: (id: string) => void;
  },
): CommandItem[] {
  const items: CommandItem[] = [];

  // Static actions
  items.push({
    id: "action-refresh",
    label: "Refresh dashboard",
    category: "action",
    shortcut: "R",
    icon: "↻",
    onSelect: actions.refresh,
  });
  items.push({
    id: "action-theme",
    label: "Toggle theme",
    category: "action",
    shortcut: "T",
    icon: "◑",
    onSelect: actions.toggleTheme,
  });

  // Navigation
  const sections = [
    { id: "stats", label: "Go to Stats", icon: "📊" },
    { id: "sessions", label: "Go to Agent Sessions", icon: "🖥" },
    { id: "agents", label: "Go to Agents", icon: "🤖" },
    { id: "prs", label: "Go to Recent PRs", icon: "🔀" },
    { id: "activity", label: "Go to Activity Log", icon: "📋" },
  ];
  for (const section of sections) {
    items.push({
      id: `nav-${section.id}`,
      label: section.label,
      category: "navigation",
      icon: section.icon,
      onSelect: () => actions.scrollToSection(section.id),
    });
  }

  if (!data) return items;

  // Agent items
  for (const agent of data.agents) {
    items.push({
      id: `agent-${agent.sessionId}`,
      label: `${agent.name} — ${agent.issue.title}`,
      category: "agent",
      icon: agent.status === "error" ? "❌" : "🤖",
      onSelect: () => {
        if (agent.pr?.url) {
          window.open(agent.pr.url, "_blank");
        } else {
          window.open(agent.issue.url, "_blank");
        }
      },
    });
  }

  // PR items
  for (const pr of data.prs) {
    const statusIcon =
      pr.mergeState === "merged"
        ? "🟣"
        : pr.ciStatus === "passing"
          ? "🟢"
          : pr.ciStatus === "failing"
            ? "🔴"
            : "🟡";
    items.push({
      id: `pr-${pr.number}`,
      label: `#${pr.number} ${pr.title}`,
      category: "pr",
      icon: statusIcon,
      onSelect: () => window.open(pr.url, "_blank"),
    });
  }

  return items;
}
