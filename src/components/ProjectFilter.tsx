"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";

interface ProjectFilterProps {
  value: string;
  onChange: (repo: string) => void;
}

export default function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  const [repos, setRepos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data: { repos: string[] }) => setRepos(data.repos))
      .catch(() => {
        // silently fail — dropdown will remain empty
      });
  }, []);

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

  if (!mounted) return null;

  const displayLabel = value
    ? value.split("/").pop() ?? value
    : "All Projects";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-1.5 text-xs text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-h-[44px]"
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
        <span className="hidden sm:inline max-w-[120px] truncate">{displayLabel}</span>
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
          className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-lg py-1 text-sm"
          data-testid="project-filter-menu"
        >
          <li
            role="option"
            aria-selected={value === ""}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 ${
              value === ""
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-700 dark:text-white/70"
            }`}
          >
            All Projects
          </li>
          {repos.map((repo) => (
            <li
              key={repo}
              role="option"
              aria-selected={value === repo}
              onClick={() => {
                onChange(repo);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 truncate ${
                value === repo
                  ? "text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-700 dark:text-white/70"
              }`}
            >
              {repo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
