"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import { fuzzyMatch } from "@/lib/fuzzyMatch";
import type { DashboardData } from "@/types/dashboard";

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  category: "action" | "agent" | "pr" | "navigation" | "page";
  shortcut?: string;
  icon: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

const RECENT_SEARCHES_KEY = "fleet-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const recent = loadRecentSearches();
    const updated = [query, ...recent.filter((r) => r !== query)].slice(
      0,
      MAX_RECENT_SEARCHES,
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore storage errors
  }
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
  page: "Pages",
};

function CommandPaletteInner({
  onClose,
  items,
}: {
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Lazy initializer runs only on client (component only mounts when mounted=true)
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query (300ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const isActionPrefix = debouncedQuery.startsWith(">");
  const searchQuery = isActionPrefix
    ? debouncedQuery.slice(1).trim()
    : debouncedQuery.trim();

  const filtered = useMemo(() => {
    const candidates = isActionPrefix
      ? items.filter((item) => item.category === "action")
      : items;

    if (!searchQuery) return candidates;

    return candidates
      .map((item) => {
        const labelMatch = fuzzyMatch(searchQuery, item.label);
        const subtitleMatch = item.subtitle
          ? fuzzyMatch(searchQuery, item.subtitle)
          : null;
        const best =
          labelMatch && subtitleMatch
            ? labelMatch.score <= subtitleMatch.score
              ? labelMatch
              : subtitleMatch
            : labelMatch ?? subtitleMatch;
        return best ? { item, score: best.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map((r) => r!.item);
  }, [items, isActionPrefix, searchQuery]);

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

  const handleClose = useCallback(() => {
    if (query.trim()) saveRecentSearch(query.trim());
    onClose();
  }, [query, onClose]);

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
            if (query.trim()) saveRecentSearch(query.trim());
            filtered[selectedIndex].onSelect();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [filtered, selectedIndex, onClose, query, handleClose],
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

  const showRecentSearches = !query.trim() && recentSearches.length > 0;

  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
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
            placeholder='Search or type ">" for actions...'
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="hidden sm:inline-flex rounded border border-gray-200 dark:border-white/20 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-white/40">
            ESC
          </kbd>
        </div>

        {/* Recent searches */}
        {showRecentSearches && (
          <div
            className="border-b border-gray-200 dark:border-white/10 px-4 py-2"
            data-testid="recent-searches"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                Recent
              </span>
              <button
                className="text-[10px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                onClick={() => {
                  clearRecentSearches();
                  setRecentSearches([]);
                }}
                data-testid="clear-recent-searches"
              >
                Clear
              </button>
            </div>
            {recentSearches.map((search) => (
              <button
                key={search}
                className="flex w-full items-center gap-2 px-1 py-1 text-left text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/80 rounded"
                onClick={() => updateQuery(search)}
                data-testid={`recent-search-item`}
              >
                <span className="text-gray-400 dark:text-white/30 text-xs">
                  ↺
                </span>
                {search}
              </button>
            ))}
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
                        onClick={() => {
                          if (query.trim()) saveRecentSearch(query.trim());
                          item.onSelect();
                          onClose();
                        }}
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

/**
 * Builds the command items list from dashboard data and action handlers.
 */
export function buildCommandItems(
  data: DashboardData | null,
  actions: {
    refresh: () => void;
    toggleTheme: () => void;
    scrollToSection: (id: string) => void;
    createIssue?: () => void;
    toggleDispatcher?: () => void;
    dispatcherPaused?: boolean;
    navigate?: (path: string) => void;
  },
): CommandItem[] {
  const items: CommandItem[] = [];

  // Pages navigation
  if (actions.navigate) {
    const pages = [
      { id: "page-overview", label: "Overview", icon: "🏠", path: "/" },
      { id: "page-agents", label: "Agents", icon: "🤖", path: "/agents" },
      {
        id: "page-prs",
        label: "Pull Requests",
        icon: "🔀",
        path: "/prs",
      },
      { id: "page-queue", label: "Queue", icon: "📋", path: "/queue" },
      {
        id: "page-services",
        label: "Services",
        icon: "🖥",
        path: "/services",
      },
      { id: "page-costs", label: "Costs", icon: "💰", path: "/costs" },
      { id: "page-reports", label: "Reports", icon: "📊", path: "/reports" },
      {
        id: "page-settings",
        label: "Settings",
        icon: "⚙️",
        path: "/settings",
      },
    ];
    for (const page of pages) {
      const nav = actions.navigate;
      items.push({
        id: page.id,
        label: page.label,
        category: "page",
        icon: page.icon,
        onSelect: () => nav(page.path),
      });
    }
  }

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
  if (actions.createIssue) {
    const create = actions.createIssue;
    items.push({
      id: "action-new-issue",
      label: "New Issue",
      category: "action",
      shortcut: "N",
      icon: "✚",
      onSelect: create,
    });
  }
  if (actions.toggleDispatcher) {
    const toggle = actions.toggleDispatcher;
    items.push({
      id: "action-dispatcher",
      label: actions.dispatcherPaused ? "Resume Dispatcher" : "Pause Dispatcher",
      category: "action",
      icon: actions.dispatcherPaused ? "▶" : "⏸",
      onSelect: toggle,
    });
  }

  // Navigation (scroll-to sections)
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
      subtitle: agent.status,
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
      subtitle: pr.branch,
      category: "pr",
      icon: statusIcon,
      onSelect: () => window.open(pr.url, "_blank"),
    });
  }

  return items;
}
