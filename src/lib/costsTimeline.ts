import type { AgentCostEntry } from "@/types/costsByProject";
import type {
  CostsTimelineResponse,
  DailyBreakdown,
  DailyProjectBreakdown,
  TimelineSeries,
} from "@/types/costsTimeline";
import { extractProjectName, parseJSONLEntries } from "@/lib/costsByProject";

/**
 * Generate an array of date strings (YYYY-MM-DD) for the last N days.
 * If days is 0, returns an empty array (used for "all time").
 */
export function buildDateRange(days: number, referenceDate?: Date): string[] {
  if (days <= 0) return [];
  const ref = referenceDate ?? new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Extract the date string (YYYY-MM-DD) from an ISO timestamp.
 */
export function timestampToDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

interface DateProjectMap {
  [date: string]: {
    [project: string]: { sessions: number; transcriptLines: number };
  };
}

/**
 * Build a map of date -> project -> { sessions, transcriptLines } from entries.
 * Filters by the provided date strings when given.
 */
export function buildDateProjectMap(
  entries: AgentCostEntry[],
  allowedDates?: Set<string>
): DateProjectMap {
  const map: DateProjectMap = {};

  for (const entry of entries) {
    if (!entry.agent_name) continue;
    const date = timestampToDate(entry.timestamp);
    if (allowedDates && !allowedDates.has(date)) continue;

    const project = extractProjectName(entry.agent_name);
    if (!map[date]) map[date] = {};
    if (!map[date][project]) {
      map[date][project] = { sessions: 0, transcriptLines: 0 };
    }
    map[date][project].sessions += 1;
    map[date][project].transcriptLines += entry.transcript_lines ?? 0;
  }

  return map;
}

/**
 * Build the timeline series for a fixed set of dates (without breakdown).
 */
function buildTimelineFromDates(
  entries: AgentCostEntry[],
  dates: string[]
): Omit<CostsTimelineResponse, "breakdown"> {
  const dateSet = new Set(dates);
  const map = buildDateProjectMap(entries, dateSet);

  // Collect all projects that appear in any date
  const projectSet = new Set<string>();
  for (const dateProjects of Object.values(map)) {
    for (const project of Object.keys(dateProjects)) {
      projectSet.add(project);
    }
  }

  const series: TimelineSeries[] = Array.from(projectSet)
    .sort()
    .map((project) => ({
      project,
      data: dates.map((date) => map[date]?.[project]?.sessions ?? 0),
    }));

  return { dates, series, days: dates.length };
}

/**
 * Build the timeline for "all time" — uses all dates present in the data.
 */
function buildAllTimeTimeline(
  entries: AgentCostEntry[]
): Omit<CostsTimelineResponse, "breakdown"> {
  const map = buildDateProjectMap(entries);

  const sortedDates = Object.keys(map).sort();
  return { ...buildTimelineFromDates(entries, sortedDates), days: 0 };
}

/**
 * Main function: build the timeline response from raw JSONL content.
 * Includes breakdown data for the daily table.
 */
export function buildTimeline(
  content: string,
  days: number
): CostsTimelineResponse {
  const entries = parseJSONLEntries(content);
  const breakdown = buildDailyBreakdown(content, days);

  if (days <= 0) {
    const timeline = buildAllTimeTimeline(entries);
    return { ...timeline, breakdown };
  }

  const dates = buildDateRange(days);
  const timeline = buildTimelineFromDates(entries, dates);
  return { ...timeline, breakdown };
}

/**
 * Build the daily breakdown table data.
 */
export function buildDailyBreakdown(
  content: string,
  days: number
): DailyBreakdown[] {
  const entries = parseJSONLEntries(content);

  let dates: string[];
  let allowedDates: Set<string> | undefined;

  if (days <= 0) {
    const map = buildDateProjectMap(entries);
    dates = Object.keys(map).sort();
    allowedDates = undefined;
  } else {
    dates = buildDateRange(days);
    allowedDates = new Set(dates);
  }

  const map = buildDateProjectMap(entries, allowedDates);

  return dates
    .filter((date) => map[date]) // only include dates with data
    .map((date) => {
      const dateProjects = map[date] ?? {};
      const projects: DailyProjectBreakdown[] = Object.entries(dateProjects)
        .map(([name, stats]) => ({
          name,
          sessions: stats.sessions,
          transcriptLines: stats.transcriptLines,
        }))
        .sort((a, b) => b.sessions - a.sessions);

      const totalSessions = projects.reduce((sum, p) => sum + p.sessions, 0);
      const totalTranscriptLines = projects.reduce(
        (sum, p) => sum + p.transcriptLines,
        0
      );
      const topProject = projects[0]?.name ?? "";

      return {
        date,
        totalSessions,
        topProject,
        transcriptLines: totalTranscriptLines,
        projects,
      };
    })
    .reverse(); // most recent first
}
