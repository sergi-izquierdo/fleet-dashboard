"use client";

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import EmptyState from "@/components/EmptyState";
import { useRelativeTime } from "@/hooks/useRelativeTime";

export type EventType = "commit" | "pr_created" | "ci_failed" | "ci_passed" | "review" | "deploy" | "error";

export interface AgentEvent {
  id: string;
  timestamp: string;
  agentName: string;
  eventType: EventType;
  description: string;
  project?: string;
}

const eventTypeConfig: Record<EventType, { label: string; color: string; dot: string }> = {
  commit: {
    label: "Commit",
    color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40",
    dot: "bg-blue-500",
  },
  pr_created: {
    label: "PR Created",
    color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
    dot: "bg-green-500",
  },
  ci_failed: {
    label: "CI Failed",
    color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
    dot: "bg-red-500",
  },
  review: {
    label: "Review",
    color: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40",
    dot: "bg-purple-500",
  },
  deploy: {
    label: "Deploy",
    color: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40",
    dot: "bg-orange-500",
  },
  ci_passed: {
    label: "CI Passed",
    color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40",
    dot: "bg-green-500",
  },
  error: {
    label: "Error",
    color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40",
    dot: "bg-red-500",
  },
};

// Module-level store for URL-based project filter (avoids setState-in-effect lint rule)
const urlChangeListeners = new Set<() => void>();

function subscribeToUrlChanges(callback: () => void) {
  urlChangeListeners.add(callback);
  window.addEventListener("popstate", callback);
  return () => {
    urlChangeListeners.delete(callback);
    window.removeEventListener("popstate", callback);
  };
}

function notifyUrlListeners() {
  urlChangeListeners.forEach((cb) => cb());
}

function getProjectFromUrl(): string {
  return new URLSearchParams(window.location.search).get("project") ?? "";
}

function RelativeTimestamp({ timestamp }: { timestamp: string }) {
  const relative = useRelativeTime(timestamp);
  return (
    <time
      className="ml-auto text-xs text-gray-400 dark:text-gray-500"
      dateTime={timestamp}
      title={new Date(timestamp).toLocaleString()}
    >
      {relative}
    </time>
  );
}

interface ProjectFilterDropdownProps {
  projects: string[];
  counts: Record<string, number>;
  selected: string;
  onSelect: (project: string) => void;
  totalCount: number;
}

function ProjectFilterDropdown({ projects, counts, selected, onSelect, totalCount }: ProjectFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleClickOutside]);

  const displayLabel = selected ? selected.split("/").pop() ?? selected : "All Projects";

  return (
    <div ref={containerRef} className="relative" data-testid="project-filter-container">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-1.5 text-xs text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        data-testid="project-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <svg
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-lg py-1 text-sm"
          data-testid="project-filter-menu"
        >
          <li
            role="option"
            aria-selected={selected === ""}
            onClick={() => {
              onSelect("");
              setOpen(false);
            }}
            className={`flex items-center justify-between cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 ${
              selected === ""
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-700 dark:text-white/70"
            }`}
            data-testid="project-filter-all"
          >
            <span>All Projects</span>
            <span className="ml-2 rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-xs text-gray-500 dark:text-white/50">
              {totalCount}
            </span>
          </li>
          {projects.map((project) => (
            <li
              key={project}
              role="option"
              aria-selected={selected === project}
              onClick={() => {
                onSelect(project);
                setOpen(false);
              }}
              className={`flex items-center justify-between cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 ${
                selected === project
                  ? "text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-700 dark:text-white/70"
              }`}
              data-testid={`project-filter-option-${project}`}
            >
              <span className="truncate">{project}</span>
              <span className="ml-2 shrink-0 rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-xs text-gray-500 dark:text-white/50">
                {counts[project] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ActivityLogProps {
  events: AgentEvent[];
  maxHeight?: string;
  isLoading?: boolean;
}

export default function ActivityLog({ events, maxHeight = "max-h-96", isLoading = false }: ActivityLogProps) {
  const selectedProject = useSyncExternalStore(
    subscribeToUrlChanges,
    getProjectFromUrl,
    () => "", // server snapshot — empty string until hydration
  );

  const handleProjectSelect = useCallback((project: string) => {
    const params = new URLSearchParams(window.location.search);
    if (project) {
      params.set("project", project);
    } else {
      params.delete("project");
    }
    const newSearch = params.toString();
    window.history.replaceState({}, "", newSearch ? `?${newSearch}` : window.location.pathname);
    notifyUrlListeners();
  }, []);

  // Derive unique projects from events that have a project field
  const projects = Array.from(
    new Set(events.map((e) => e.project).filter((p): p is string => Boolean(p)))
  ).sort();

  // Count events per project
  const counts: Record<string, number> = {};
  for (const event of events) {
    if (event.project) {
      counts[event.project] = (counts[event.project] ?? 0) + 1;
    }
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filtered = selectedProject
    ? sorted.filter((e) => e.project === selectedProject)
    : sorted;

  const showFilter = projects.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
        {showFilter && (
          <ProjectFilterDropdown
            projects={projects}
            counts={counts}
            selected={selectedProject}
            onSelect={handleProjectSelect}
            totalCount={events.length}
          />
        )}
      </div>
      <div className={`${maxHeight} overflow-y-auto pr-1`} data-testid="activity-log-scroll">
        {isLoading && sorted.length === 0 ? (
          <ul className="space-y-2" role="list" aria-label="Loading activity">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 h-16 animate-pulse"
              >
                <div className="flex flex-col items-center pt-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="ml-auto h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6 text-gray-400 dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No recent activity"
            description="Events from your agents will appear here as they work."
          />
        ) : (
          <ul className="space-y-2" role="list">
            {filtered.map((event, index) => {
              const config = eventTypeConfig[event.eventType];
              return (
                <li
                  key={event.id}
                  className="relative flex gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/80 animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
                      data-testid={`dot-${event.eventType}`}
                    />
                    <span className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {event.agentName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}
                        data-testid={`badge-${event.eventType}`}
                      >
                        {config.label}
                      </span>
                      <RelativeTimestamp timestamp={event.timestamp} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
