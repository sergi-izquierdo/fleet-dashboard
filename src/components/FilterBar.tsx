"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResultCount {
  shown: number;
  total: number;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  resultCount?: ResultCount;
  children?: React.ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  resultCount,
  children,
}: FilterBarProps) {
  const [localValue, setLocalValue] = useState(searchValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(searchValue);
  }, [searchValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearchChange(val);
      }, 300);
    },
    [onSearchChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      data-testid="filter-bar"
      className="mb-4 flex flex-wrap items-center gap-3"
    >
      <div className="relative flex-1 min-w-[180px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/30 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          data-testid="filter-bar-search"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-9 pr-3 py-1.5 text-sm text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label={placeholder}
        />
      </div>
      {children}
      {resultCount !== undefined && (
        <span
          data-testid="filter-bar-result-count"
          className="text-xs text-gray-500 dark:text-white/40 whitespace-nowrap ml-auto"
        >
          Showing {resultCount.shown} of {resultCount.total}
        </span>
      )}
    </div>
  );
}
