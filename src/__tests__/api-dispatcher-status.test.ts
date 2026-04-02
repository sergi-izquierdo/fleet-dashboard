import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiCache from "@/lib/apiCache";
import { GET } from "@/app/api/dispatcher-status/route";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

describe("GET /api/dispatcher-status", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    apiCache.clear();
  });

  it("returns offline: true when status file is missing", async () => {
    mockReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" })
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ offline: true });
  });

  it("returns valid dispatcher status structure", async () => {
    const now = new Date().toISOString();
    const mockStatus = {
      cycle: {
        startedAt: now,
        finishedAt: now,
        durationMs: 1200,
        nextRunAt: now,
        consecutiveErrors: 0,
        errors: [],
      },
      rateLimit: {
        remaining: 4500,
        limit: 5000,
        level: "ok",
        resetAt: now,
      },
      phases: {
        sync: { status: "completed", durationMs: 300 },
        dispatch: { status: "completed", durationMs: 900 },
      },
      prPipeline: [{ repo: "owner/repo", pr: 42, stage: "merge" }],
      activeAgents: ["agent-1"],
      completedAgents: ["agent-2"],
    };

    mockReadFile.mockResolvedValue(JSON.stringify(mockStatus));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("cycle");
    expect(data.cycle).toHaveProperty("startedAt");
    expect(data.cycle).toHaveProperty("finishedAt");
    expect(data.cycle).toHaveProperty("durationMs");
    expect(data.cycle).toHaveProperty("consecutiveErrors");
    expect(data).toHaveProperty("rateLimit");
    expect(data.rateLimit).toHaveProperty("level");
    expect(data).toHaveProperty("phases");
    expect(data).toHaveProperty("prPipeline");
    expect(Array.isArray(data.prPipeline)).toBe(true);
    expect(data).toHaveProperty("activeAgents");
    expect(data).toHaveProperty("completedAgents");
    expect(data).toHaveProperty("offline");
  });

  it("sets offline: true when finishedAt is more than 180s ago", async () => {
    const old = new Date(Date.now() - 200_000).toISOString(); // 200 seconds ago
    const mockStatus = {
      cycle: {
        startedAt: old,
        finishedAt: old,
        durationMs: 500,
        nextRunAt: old,
        consecutiveErrors: 0,
        errors: [],
      },
      rateLimit: { remaining: 5000, limit: 5000, level: "ok", resetAt: old },
      phases: {},
      prPipeline: [],
      activeAgents: [],
      completedAgents: [],
    };

    mockReadFile.mockResolvedValue(JSON.stringify(mockStatus));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.offline).toBe(true);
  });

  it("sets offline: false when finishedAt is recent", async () => {
    const recent = new Date(Date.now() - 30_000).toISOString(); // 30 seconds ago
    const mockStatus = {
      cycle: {
        startedAt: recent,
        finishedAt: recent,
        durationMs: 500,
        nextRunAt: recent,
        consecutiveErrors: 0,
        errors: [],
      },
      rateLimit: {
        remaining: 5000,
        limit: 5000,
        level: "ok",
        resetAt: recent,
      },
      phases: {},
      prPipeline: [],
      activeAgents: [],
      completedAgents: [],
    };

    mockReadFile.mockResolvedValue(JSON.stringify(mockStatus));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.offline).toBe(false);
  });
});
