"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import type { DailyBreakdown } from "@/types/costsTimeline";

type SortKey = "date" | "totalSessions" | "topProject" | "transcriptLines";
type SortDir = "asc" | "desc";

interface Props {
  breakdown: DailyBreakdown[];
}

function sortRows(
  rows: DailyBreakdown[],
  key: SortKey,
  dir: SortDir
): DailyBreakdown[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "date") {
      cmp = a.date.localeCompare(b.date);
    } else if (key === "totalSessions") {
      cmp = a.totalSessions - b.totalSessions;
    } else if (key === "topProject") {
      cmp = a.topProject.localeCompare(b.topProject);
    } else if (key === "transcriptLines") {
      cmp = a.transcriptLines - b.transcriptLines;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      scope="col"
      className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 select-none"
      onClick={() => onSort(sortKey)}
      aria-sort={isActive ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={[
            "h-3 w-3",
            isActive
              ? "text-green-500"
              : "text-gray-300 dark:text-gray-600",
          ].join(" ")}
        />
      </span>
    </th>
  );
}

export default function CostDailyBreakdown({ breakdown }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleExpand(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  const sorted = sortRows(breakdown, sortKey, sortDir);

  if (breakdown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Daily Breakdown
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.06]">
        <table
          className="min-w-full text-sm"
          aria-label="Daily cost breakdown"
          data-testid="daily-breakdown-table"
        >
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              <th
                scope="col"
                className="w-8 px-2 py-2"
                aria-label="Expand row"
              />
              <SortableHeader
                label="Date"
                sortKey="date"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Total Sessions"
                sortKey="totalSessions"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Top Project"
                sortKey="topProject"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Transcript Lines"
                sortKey="transcriptLines"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {sorted.map((row) => {
              const isOpen = expanded.has(row.date);
              return (
                <>
                  <tr
                    key={row.date}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    onClick={() => toggleExpand(row.date)}
                    aria-expanded={isOpen}
                    data-testid={`row-${row.date}`}
                  >
                    <td className="px-2 py-2 text-gray-400 dark:text-gray-500">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {row.date}
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">
                      {row.totalSessions}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.topProject || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.transcriptLines.toLocaleString()}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.date}-expanded`} className="bg-gray-50 dark:bg-white/[0.02]">
                      <td colSpan={5} className="px-6 py-2">
                        <table className="min-w-full text-xs" aria-label={`Projects for ${row.date}`}>
                          <thead>
                            <tr>
                              <th
                                scope="col"
                                className="py-1 pr-4 text-left text-gray-500 dark:text-gray-400 font-medium"
                              >
                                Project
                              </th>
                              <th
                                scope="col"
                                className="py-1 pr-4 text-left text-gray-500 dark:text-gray-400 font-medium"
                              >
                                Sessions
                              </th>
                              <th
                                scope="col"
                                className="py-1 text-left text-gray-500 dark:text-gray-400 font-medium"
                              >
                                Transcript Lines
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                            {row.projects.map((p) => (
                              <tr key={p.name}>
                                <td className="py-1 pr-4 text-gray-700 dark:text-gray-300">
                                  {p.name}
                                </td>
                                <td className="py-1 pr-4 text-gray-900 dark:text-white">
                                  {p.sessions}
                                </td>
                                <td className="py-1 text-gray-700 dark:text-gray-300">
                                  {p.transcriptLines.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
