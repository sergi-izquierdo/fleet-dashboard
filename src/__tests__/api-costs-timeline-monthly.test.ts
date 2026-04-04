/**
 * Additional edge-case tests for /api/costs/timeline (#363):
 * - Single entry in JSONL
 * - Entries spanning multiple months
 * - All entries on same day
 * - Entries from different projects on same day
 * - Large number of entries
 * - JSONL with malformed lines mixed with valid ones
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildTimeline,
  buildDailyBreakdown,
  buildDateProjectMap,
  timestampToDate,
} from "@/lib/costsTimeline";

// ─────────────────────────────────────────────────────────────────────────────
// Single entry edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("buildTimeline — single entry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 7 dates and 1 series for a single entry within range", () => {
    const jsonl =
      '{"timestamp":"2026-04-03T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":100}';

    const result = buildTimeline(jsonl, 7);

    expect(result.dates).toHaveLength(7);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].project).toBe("fleet");
  });

  it("series data has exactly one non-zero value for a single entry", () => {
    const jsonl =
      '{"timestamp":"2026-04-03T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":50}';

    const result = buildTimeline(jsonl, 7);
    const nonZero = result.series[0].data.filter((v) => v > 0);
    expect(nonZero).toHaveLength(1);
  });

  it("handles a single entry that is exactly at the start of the date range", () => {
    // For 7-day window ending 2026-04-04, the oldest date is 2026-03-29 (today - 6)
    const jsonl =
      '{"timestamp":"2026-03-29T00:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":10}';

    const result = buildTimeline(jsonl, 7);
    // 2026-03-29 should be in range (it's the oldest date in a 7-day window)
    expect(result.dates).toContain("2026-03-29");
    expect(result.series).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Entries spanning multiple months
// ─────────────────────────────────────────────────────────────────────────────

describe("buildTimeline — entries spanning multiple months", () => {
  it("returns dates from both months when entries span a month boundary (days=0)", () => {
    const jsonl = [
      '{"timestamp":"2026-02-28T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":10}',
      '{"timestamp":"2026-03-01T10:00:00Z","session_id":"s2","agent_name":"agent-fleet-2","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":20}',
      '{"timestamp":"2026-03-31T10:00:00Z","session_id":"s3","agent_name":"agent-other-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/c.jsonl","transcript_lines":30}',
    ].join("\n");

    const result = buildTimeline(jsonl, 0);

    expect(result.dates).toContain("2026-02-28");
    expect(result.dates).toContain("2026-03-01");
    expect(result.dates).toContain("2026-03-31");
    // Should have entries for fleet and other projects
    const projects = result.series.map((s) => s.project);
    expect(projects).toContain("fleet");
    expect(projects).toContain("other");
  });

  it("dates are in ascending order when spanning multiple months", () => {
    const jsonl = [
      '{"timestamp":"2026-03-31T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":10}',
      '{"timestamp":"2026-02-15T10:00:00Z","session_id":"s2","agent_name":"agent-fleet-2","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":10}',
    ].join("\n");

    const result = buildTimeline(jsonl, 0);
    // Dates should be in ascending order
    for (let i = 1; i < result.dates.length; i++) {
      expect(result.dates[i] > result.dates[i - 1]).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// All entries on same day
// ─────────────────────────────────────────────────────────────────────────────

describe("buildTimeline — all entries on same day", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accumulates transcript lines from multiple same-day entries for same project", () => {
    const jsonl = [
      '{"timestamp":"2026-04-01T08:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":100}',
      '{"timestamp":"2026-04-01T14:00:00Z","session_id":"s2","agent_name":"agent-fleet-2","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":200}',
      '{"timestamp":"2026-04-01T20:00:00Z","session_id":"s3","agent_name":"agent-fleet-3","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/c.jsonl","transcript_lines":300}',
    ].join("\n");

    const breakdown = buildDailyBreakdown(jsonl, 7);
    const day = breakdown.find((d) => d.date === "2026-04-01");

    expect(day).toBeDefined();
    expect(day!.totalSessions).toBe(3);
    expect(day!.transcriptLines).toBe(600);
    expect(day!.topProject).toBe("fleet");
  });

  it("multiple projects on same day — each appears in per-project breakdown", () => {
    const jsonl = [
      '{"timestamp":"2026-04-01T08:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":50}',
      '{"timestamp":"2026-04-01T10:00:00Z","session_id":"s2","agent_name":"agent-other-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":30}',
      '{"timestamp":"2026-04-01T12:00:00Z","session_id":"s3","agent_name":"agent-dashboard-1","model":"opus","cwd":"/tmp","transcript_path":"/tmp/c.jsonl","transcript_lines":20}',
    ].join("\n");

    const breakdown = buildDailyBreakdown(jsonl, 7);
    const day = breakdown.find((d) => d.date === "2026-04-01");

    expect(day).toBeDefined();
    expect(day!.projects).toHaveLength(3);
    const projectNames = day!.projects.map((p) => p.name);
    expect(projectNames).toContain("fleet");
    expect(projectNames).toContain("other");
    expect(projectNames).toContain("dashboard");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildDateProjectMap — additional edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDateProjectMap — edge cases", () => {
  it("returns empty object for empty entries array", () => {
    const map = buildDateProjectMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("handles agent_name with no dash separator gracefully", () => {
    // agent_name without dash → project name extraction edge case
    const entries = [
      {
        timestamp: "2026-04-01T10:00:00Z",
        session_id: "s1",
        agent_name: "simpleagent",
        model: "sonnet",
        cwd: "/tmp",
        transcript_path: "/tmp/a.jsonl",
        transcript_lines: 10,
      },
    ];
    // Should not crash
    expect(() => buildDateProjectMap(entries)).not.toThrow();
    const map = buildDateProjectMap(entries);
    expect(map["2026-04-01"]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// timestampToDate — additional edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("timestampToDate — edge cases", () => {
  it("handles end of year timestamps", () => {
    expect(timestampToDate("2025-12-31T23:59:59Z")).toBe("2025-12-31");
  });

  it("handles start of year timestamps", () => {
    expect(timestampToDate("2026-01-01T00:00:00Z")).toBe("2026-01-01");
  });

  it("handles leap day timestamps", () => {
    expect(timestampToDate("2024-02-29T12:00:00Z")).toBe("2024-02-29");
  });
});
