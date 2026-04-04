"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { fuzzyMatch } from "@/lib/fuzzyMatch";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { DashboardData } from "@/types/dashboard";

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
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
  navigation: "Pages",
};

const RECENT_SEARCHES_KEY = "fleet-cmd-recent";
const MAX_RECENT = 5;

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
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    RECENT_SEARCHES_KEY,
    [],
  );

  // ">" prefix shows only action items (VS Code-style)
  const isActionMode = query.trimStart().startsWith(">");
  const searchText = isActionMode ? query.replace(/^[^>]*>/, "").trim() : query;
  const candidateItems = isActionMode
    ? items.filter((i) => i.category === "action")
    : items;

  const filtered = useMemo(() => {
    if (!searchText.trim()) return candidateItems;
    return candidateItems
      .map((item) => {
        const match =
          fuzzyMatch(searchText, item.label) ??
          (item.subtitle ? fuzzyMatch(searchText, item.subtitle) : null);
        return match ? { item, score: match.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map((r) => r!.item);
  }, [searchText, candidateItems]);

  const saveRecentSearch = useCallback(
    (term: string) => {
      if (!term.trim() || term.startsWith(">")) return;
      setRecentSearches(
        [term, ...recentSearches.filter((s) => s !== term)].slice(0, MAX_RECENT),
      );
    },
    [recentSearches, setRecentSearches],
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      saveRecentSearch(query.trim());
      item.onSelect();
      onClose();
    },
    [query, saveRecentSearch, onClose],
  );

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
            handleSelect(filtered[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, onClose, handleSelect],
  );

  // Group items by category while preserving order
  const grouped: { category: CommandItem["category"]; items: CommandItem[] }[] = [];
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
  const isEmpty = !query.trim();
  const hasRecents = recentSearches.length > 0;

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
            placeholder='Type to search, or ">" for actions…'
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="hidden sm:inline-flex rounded border border-gray-200 dark:border-white/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-white/40">
            ESC
          </kbd>
        </div>

        {/* Recent searches — shown when query is empty */}
        {isEmpty && hasRecents && (
          <div className="border-b border-gray-100 dark:border-white/[0.06] px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                Recent
              </span>
              <button
                onClick={() => setRecentSearches([])}
                className="text-[10px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
                data-testid="clear-recent-searches"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => updateQuery(term)}
                  className="rounded-md border border-gray-200 dark:border-white/10 px-2 py-0.5 text-xs text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white/70 transition-colors"
                  data-testid={`recent-search-${term}`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

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
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        data-testid={`command-item-${item.id}`}
                      >
                        <span className="text-base" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{item.label}</span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-gray-400 dark:text-white/30">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
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
          <span className="ml-auto">
            <kbd className="font-medium">&gt;</kbd> actions only
          </span>
        </div>
      </div>
    </div>
  );
}

const PAGES = [
  { href: "/", label: "Overview", icon: "🏠" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/prs", label: "Pull Requests", icon: "🔀" },
  { href: "/queue", label: "Queue", icon: "📋" },
  { href: "/services", label: "Services", icon: "🖥" },
  { href: "/costs", label: "Costs", icon: "💰" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

/**
 * Builds the command items list from dashboard data and action handlers.
 */
export function buildCommandItems(
  data: DashboardData | null,
  actions: {
    refresh: () => void;
    toggleTheme: () => void;
    scrollToSection: (id: string) => void;
    navigate?: (path: string) => void;
    onNewIssue?: () => void;
    onToggleDispatcher?: () => void;
    dispatcherPaused?: boolean;
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

  if (actions.onNewIssue) {
    items.push({
      id: "action-new-issue",
      label: "New Issue",
      category: "action",
      icon: "📝",
      onSelect: actions.onNewIssue,
    });
  }

  if (actions.onToggleDispatcher) {
    const paused = actions.dispatcherPaused ?? false;
    items.push({
      id: "action-toggle-dispatcher",
      label: paused ? "Resume Dispatcher" : "Pause Dispatcher",
      category: "action",
      icon: paused ? "▶️" : "⏸️",
      onSelect: actions.onToggleDispatcher,
    });
  }

  // Page navigation
  if (actions.navigate) {
    for (const page of PAGES) {
      items.push({
        id: `nav-page-${page.href.replace(/\//g, "") || "home"}`,
        label: page.label,
        subtitle: page.href === "/" ? "/" : page.href,
        category: "navigation",
        icon: page.icon,
        onSelect: () => actions.navigate!(page.href),
      });
    }
  } else {
    // Fallback: scroll-to-section navigation (used when navigate is not provided)
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
  }

  if (!data) return items;

  // Agent items
  for (const agent of data.agents) {
    items.push({
      id: `agent-${agent.sessionId}`,
      label: `${agent.name} — ${agent.issue.title}`,
      subtitle: `#${agent.issue.number} · ${agent.status}`,
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
      subtitle: `${pr.author} · ${pr.ciStatus}`,
      category: "pr",
      icon: statusIcon,
      onSelect: () => window.open(pr.url, "_blank"),
    });
  }

  return items;
}
