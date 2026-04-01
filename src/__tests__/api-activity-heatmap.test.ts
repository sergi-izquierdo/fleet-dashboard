import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseJSONLCostEntries,
  buildHeatmapDays,
  toDateString,
} from "@/lib/activityHeatmap";
import { GET } from "@/app/api/activity/heatmap/route";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import * as fs from "fs";

describe("toDateString", () => {
  it("returns YYYY-MM-DD from ISO timestamp", () => {
    expect(toDateString("2026-03-31T10:00:00Z")).toBe("2026-03-31");
  });

  it("returns null for invalid timestamp", () => {
    expect(toDateString("not-a-date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toDateString("")).toBeNull();
  });
});

describe("parseJSONLCostEntries", () => {
  it("parses valid JSONL lines", () => {
    const content =
      '{"timestamp":"2026-03-31T10:00:00Z","agent_name":"agent-1"}\n' +
      '{"timestamp":"2026-04-01T12:00:00Z","agent_name":"agent-2"}';
    const entries = parseJSONLCostEntries(content);
    expect(entries).toHaveLength(2);
    expect(entries[0].timestamp).toBe("2026-03-31T10:00:00Z");
  });

  it("skips empty lines", () => {
    const content =
      '{"timestamp":"2026-03-31T10:00:00Z"}\n\n\n';
    expect(parseJSONLCostEntries(content)).toHaveLength(1);
  });

  it("skips invalid JSON lines", () => {
    const content =
      '{"timestamp":"2026-03-31T10:00:00Z"}\nnot-json\n{"timestamp":"2026-04-01T00:00:00Z"}';
    expect(parseJSONLCostEntries(content)).toHaveLength(2);
  });

  it("returns empty array for empty string", () => {
    expect(parseJSONLCostEntries("")).toHaveLength(0);
  });
});

describe("buildHeatmapDays", () => {
  const now = new Date("2026-04-01T12:00:00Z");

  it("returns exactly 90 days", () => {
    const result = buildHeatmapDays([], [], 90, now);
    expect(result).toHaveLength(90);
  });

  it("first day is 89 days before today, last day is today", () => {
    const result = buildHeatmapDays([], [], 90, now);
    expect(result[0].date).toBe("2026-01-02");
    expect(result[result.length - 1].date).toBe("2026-04-01");
  });

  it("counts agent entries per day", () => {
    const costEntries = [
      { timestamp: "2026-04-01T10:00:00Z" },
      { timestamp: "2026-04-01T11:00:00Z" },
      { timestamp: "2026-03-31T09:00:00Z" },
    ];
    const result = buildHeatmapDays(costEntries, [], 90, now);
    const today = result.find((d) => d.date === "2026-04-01");
    expect(today?.agents).toBe(2);
    expect(today?.count).toBe(2);

    const yesterday = result.find((d) => d.date === "2026-03-31");
    expect(yesterday?.agents).toBe(1);
  });

  it("counts PR completions per day", () => {
    const completed = [
      { completedAt: "2026-04-01T10:00:00Z", pr: "https://github.com/x/y/pull/1" },
      { completedAt: "2026-04-01T11:00:00Z", pr: "https://github.com/x/y/pull/2" },
    ];
    const result = buildHeatmapDays([], completed, 90, now);
    const today = result.find((d) => d.date === "2026-04-01");
    expect(today?.prs).toBe(2);
    expect(today?.count).toBe(2);
  });

  it("does not count completed entries without PR field", () => {
    const completed = [
      { completedAt: "2026-04-01T10:00:00Z" },
    ];
    const result = buildHeatmapDays([], completed, 90, now);
    const today = result.find((d) => d.date === "2026-04-01");
    expect(today?.prs).toBe(0);
  });

  it("combines agents and prs in count", () => {
    const costEntries = [{ timestamp: "2026-04-01T10:00:00Z" }];
    const completed = [
      { completedAt: "2026-04-01T11:00:00Z", pr: "https://github.com/x/y/pull/1" },
    ];
    const result = buildHeatmapDays(costEntries, completed, 90, now);
    const today = result.find((d) => d.date === "2026-04-01");
    expect(today?.agents).toBe(1);
    expect(today?.prs).toBe(1);
    expect(today?.count).toBe(2);
  });

  it("returns zero counts for all days when no data", () => {
    const result = buildHeatmapDays([], [], 90, now);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });

  it("ignores entries outside the 90-day window", () => {
    const oldEntry = { timestamp: "2020-01-01T00:00:00Z" };
    const result = buildHeatmapDays([oldEntry], [], 90, now);
    expect(result.every((d) => d.agents === 0)).toBe(true);
  });
});

describe("GET /api/activity/heatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 90 days when both files exist", async () => {
    const costLine =
      '{"timestamp":"2026-04-01T10:00:00Z","agent_name":"agent-1"}';
    const stateJson = JSON.stringify({
      completed: {
        "agent-1": {
          completedAt: "2026-04-01T11:00:00Z",
          pr: "https://github.com/x/y/pull/1",
          status: "pr_merged",
        },
      },
    });

    (fs.readFileSync as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(costLine)
      .mockReturnValueOnce(stateJson);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days).toHaveLength(90);
  });

  it("returns empty days array when agent-costs.jsonl does not exist", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => {
        throw new Error("ENOENT");
      })
      .mockImplementationOnce(() => {
        throw new Error("ENOENT");
      });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days).toHaveLength(90);
    expect(body.days.every((d: { count: number }) => d.count === 0)).toBe(true);
  });

  it("handles corrupted state.json gracefully", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("")
      .mockReturnValueOnce("not valid json{{{");

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toHaveLength(90);
  });
});
