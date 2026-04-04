import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  buildDateRange,
  timestampToDate,
  buildDateProjectMap,
  buildTimeline,
  buildDailyBreakdown,
} from "@/lib/costsTimeline";
import { GET } from "@/app/api/costs/timeline/route";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import * as fs from "fs";

// ---- buildDateRange ----

describe("buildDateRange", () => {
  it("returns N date strings for N days", () => {
    const ref = new Date("2026-04-04T12:00:00Z");
    const dates = buildDateRange(7, ref);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-03-29");
    expect(dates[6]).toBe("2026-04-04");
  });

  it("returns 30 dates for 30 days", () => {
    const ref = new Date("2026-04-04T00:00:00Z");
    expect(buildDateRange(30, ref)).toHaveLength(30);
  });

  it("returns empty array for days=0", () => {
    expect(buildDateRange(0)).toHaveLength(0);
  });

  it("dates are in ascending order", () => {
    const ref = new Date("2026-04-04T12:00:00Z");
    const dates = buildDateRange(3, ref);
    expect(dates).toEqual(["2026-04-02", "2026-04-03", "2026-04-04"]);
  });
});

// ---- timestampToDate ----

describe("timestampToDate", () => {
  it("extracts date from ISO timestamp", () => {
    expect(timestampToDate("2026-04-01T14:27:34.288Z")).toBe("2026-04-01");
  });

  it("handles midnight timestamps", () => {
    expect(timestampToDate("2026-03-15T00:00:00Z")).toBe("2026-03-15");
  });
});

// ---- buildDateProjectMap ----

describe("buildDateProjectMap", () => {
  const entries = [
    {
      timestamp: "2026-04-01T10:00:00Z",
      session_id: "s1",
      agent_name: "agent-fleet-1",
      model: "sonnet",
      cwd: "/tmp",
      transcript_path: "/tmp/a.jsonl",
      transcript_lines: 100,
    },
    {
      timestamp: "2026-04-01T12:00:00Z",
      session_id: "s2",
      agent_name: "agent-fleet-2",
      model: "sonnet",
      cwd: "/tmp",
      transcript_path: "/tmp/b.jsonl",
      transcript_lines: 50,
    },
    {
      timestamp: "2026-04-02T09:00:00Z",
      session_id: "s3",
      agent_name: "agent-other-1",
      model: "haiku",
      cwd: "/tmp",
      transcript_path: "/tmp/c.jsonl",
      transcript_lines: 30,
    },
  ];

  it("groups entries by date and project", () => {
    const map = buildDateProjectMap(entries);
    expect(map["2026-04-01"]["fleet"]).toEqual({
      sessions: 2,
      transcriptLines: 150,
    });
    expect(map["2026-04-02"]["other"]).toEqual({
      sessions: 1,
      transcriptLines: 30,
    });
  });

  it("filters by allowedDates when provided", () => {
    const allowed = new Set(["2026-04-01"]);
    const map = buildDateProjectMap(entries, allowed);
    expect(map["2026-04-01"]).toBeDefined();
    expect(map["2026-04-02"]).toBeUndefined();
  });

  it("skips entries with missing agent_name", () => {
    const withMissing = [
      ...entries,
      {
        timestamp: "2026-04-03T10:00:00Z",
        session_id: "s4",
        agent_name: "",
        model: "sonnet",
        cwd: "/tmp",
        transcript_path: "/tmp/d.jsonl",
        transcript_lines: 10,
      },
    ];
    const map = buildDateProjectMap(withMissing);
    expect(map["2026-04-03"]).toBeUndefined();
  });
});

// ---- buildTimeline ----

describe("buildTimeline", () => {
  const jsonl =
    '{"timestamp":"2026-04-01T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":99}\n' +
    '{"timestamp":"2026-04-02T11:00:00Z","session_id":"s2","agent_name":"agent-other-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":50}';

  it("returns correct dates array for days=7", () => {
    const ref = new Date("2026-04-04T00:00:00Z");
    // Use a fixed reference via vi.setSystemTime
    vi.useFakeTimers();
    vi.setSystemTime(ref);
    const result = buildTimeline(jsonl, 7);
    vi.useRealTimers();
    expect(result.dates).toHaveLength(7);
    expect(result.dates[result.dates.length - 1]).toBe("2026-04-04");
  });

  it("returns series for each project present in date range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const result = buildTimeline(jsonl, 7);
    vi.useRealTimers();
    const projects = result.series.map((s) => s.project);
    expect(projects).toContain("fleet");
    expect(projects).toContain("other");
  });

  it("series data length matches dates length", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const result = buildTimeline(jsonl, 7);
    vi.useRealTimers();
    for (const series of result.series) {
      expect(series.data).toHaveLength(result.dates.length);
    }
  });

  it("returns all dates present in data when days=0", () => {
    const result = buildTimeline(jsonl, 0);
    expect(result.dates).toContain("2026-04-01");
    expect(result.dates).toContain("2026-04-02");
    expect(result.days).toBe(0);
  });

  it("returns empty series for empty content", () => {
    const result = buildTimeline("", 7);
    expect(result.series).toHaveLength(0);
  });
});

// ---- buildDailyBreakdown ----

describe("buildDailyBreakdown", () => {
  const jsonl =
    '{"timestamp":"2026-04-01T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":100}\n' +
    '{"timestamp":"2026-04-01T12:00:00Z","session_id":"s2","agent_name":"agent-fleet-2","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":50}\n' +
    '{"timestamp":"2026-04-02T09:00:00Z","session_id":"s3","agent_name":"agent-other-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/c.jsonl","transcript_lines":30}';

  it("returns breakdown only for dates with data", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const breakdown = buildDailyBreakdown(jsonl, 7);
    vi.useRealTimers();
    expect(breakdown.some((d) => d.date === "2026-04-01")).toBe(true);
    expect(breakdown.some((d) => d.date === "2026-04-02")).toBe(true);
  });

  it("totals sessions correctly per day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const breakdown = buildDailyBreakdown(jsonl, 7);
    vi.useRealTimers();
    const day1 = breakdown.find((d) => d.date === "2026-04-01");
    expect(day1?.totalSessions).toBe(2);
    expect(day1?.transcriptLines).toBe(150);
    expect(day1?.topProject).toBe("fleet");
  });

  it("returns most recent date first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const breakdown = buildDailyBreakdown(jsonl, 7);
    vi.useRealTimers();
    expect(breakdown[0].date > breakdown[1].date).toBe(true);
  });

  it("includes per-project breakdown in each row", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const breakdown = buildDailyBreakdown(jsonl, 7);
    vi.useRealTimers();
    const day1 = breakdown.find((d) => d.date === "2026-04-01");
    expect(day1?.projects).toHaveLength(1);
    expect(day1?.projects[0].name).toBe("fleet");
    expect(day1?.projects[0].sessions).toBe(2);
  });
});

// ---- GET /api/costs/timeline ----

describe("GET /api/costs/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid days parameter", async () => {
    const req = new NextRequest(
      "http://localhost/api/costs/timeline?days=invalid"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for unsupported days value", async () => {
    const req = new NextRequest(
      "http://localhost/api/costs/timeline?days=15"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns empty timeline when file does not exist", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });

    const req = new NextRequest("http://localhost/api/costs/timeline?days=7");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dates).toEqual([]);
    expect(body.series).toEqual([]);
    expect(body.days).toBe(7);
  });

  it("defaults to 7 days when no param provided", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("");

    const req = new NextRequest("http://localhost/api/costs/timeline");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(7);
    expect(body.dates).toHaveLength(7);
  });

  it("returns timeline data with series from JSONL", async () => {
    const jsonl =
      '{"timestamp":"2026-04-01T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":99}';

    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(jsonl);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T00:00:00Z"));
    const req = new NextRequest("http://localhost/api/costs/timeline?days=7");
    const res = await GET(req);
    vi.useRealTimers();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dates).toHaveLength(7);
    expect(body.series).toHaveLength(1);
    expect(body.series[0].project).toBe("fleet");
    expect(body.series[0].data).toHaveLength(7);
  });

  it("accepts days=0 for all time", async () => {
    const jsonl =
      '{"timestamp":"2020-01-01T00:00:00Z","session_id":"s1","agent_name":"agent-old-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":10}';

    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(jsonl);

    const req = new NextRequest("http://localhost/api/costs/timeline?days=0");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(0);
    expect(body.dates).toContain("2020-01-01");
  });

  it("accepts days=14", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("");

    const req = new NextRequest("http://localhost/api/costs/timeline?days=14");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(14);
    expect(body.dates).toHaveLength(14);
  });

  it("accepts days=30", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("");

    const req = new NextRequest("http://localhost/api/costs/timeline?days=30");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(30);
    expect(body.dates).toHaveLength(30);
  });
});
