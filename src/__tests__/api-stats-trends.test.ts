import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/stats/trends${query}`);
}

function stateWith(completedEntries: Record<string, { completedAt: string }>) {
  return JSON.stringify({ active: {}, completed: completedEntries });
}

beforeEach(() => {
  mockReadFile.mockReset();
  fetchMock.mockReset();
  apiCache.clear();
  // Default: GitHub API returns empty array
  fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
});

describe("GET /api/stats/trends", () => {
  it("returns 200 with correct shape", async () => {
    mockReadFile.mockResolvedValue(stateWith({}));
    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.agents24h)).toBe(true);
    expect(Array.isArray(data.prsMerged7d)).toBe(true);
    expect(Array.isArray(data.issuesCompleted7d)).toBe(true);
  });

  it("returns 24 hourly buckets for agents24h", async () => {
    mockReadFile.mockResolvedValue(stateWith({}));
    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.agents24h).toHaveLength(24);
  });

  it("returns 7 daily buckets for prsMerged7d and issuesCompleted7d", async () => {
    mockReadFile.mockResolvedValue(stateWith({}));
    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.prsMerged7d).toHaveLength(7);
    expect(data.issuesCompleted7d).toHaveLength(7);
  });

  it("returns all zeros when state is empty", async () => {
    mockReadFile.mockResolvedValue(stateWith({}));
    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.agents24h.every((v: number) => v === 0)).toBe(true);
    expect(data.issuesCompleted7d.every((v: number) => v === 0)).toBe(true);
  });

  it("counts recently completed agents in agents24h", async () => {
    const recentTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    mockReadFile.mockResolvedValue(
      stateWith({ "a/1": { completedAt: recentTime } }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    // Most recent hour is the last bucket (index 23)
    expect(data.agents24h[23]).toBe(1);
    // Total should sum to 1
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });

  it("excludes agents completed more than 24h ago from agents24h", async () => {
    const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
    mockReadFile.mockResolvedValue(stateWith({ "a/1": { completedAt: oldTime } }));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("counts recently completed issues in issuesCompleted7d", async () => {
    const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago (today)
    mockReadFile.mockResolvedValue(stateWith({ "a/1": { completedAt: recentTime } }));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    // Today is the last bucket (index 6)
    expect(data.issuesCompleted7d[6]).toBe(1);
  });

  it("excludes issues completed more than 7 days ago from issuesCompleted7d", async () => {
    const oldTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago
    mockReadFile.mockResolvedValue(stateWith({ "a/1": { completedAt: oldTime } }));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    const total = (data.issuesCompleted7d as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("counts merged PRs from GitHub API in prsMerged7d", async () => {
    const today = new Date().toISOString();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ merged_at: today }, { merged_at: today }],
    });
    mockReadFile.mockResolvedValue(stateWith({}));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    // Each repo contributes 2 merges, default 4 repos = 8 today (index 6)
    expect(data.prsMerged7d[6]).toBeGreaterThanOrEqual(2);
  });

  it("returns zeros for prsMerged7d when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));
    mockReadFile.mockResolvedValue(stateWith({}));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prsMerged7d.every((v: number) => v === 0)).toBe(true);
  });

  it("uses cache on second request", async () => {
    mockReadFile.mockResolvedValue(stateWith({}));

    const { GET } = await import("@/app/api/stats/trends/route");
    await GET(makeRequest("?fresh=true"));
    await GET(makeRequest()); // second request should hit cache

    // readFile should only be called once (for the fresh request)
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("handles invalid JSON in state file gracefully (returns 200 with zeros)", async () => {
    mockReadFile.mockResolvedValue("invalid json{{{");
    fetchMock.mockRejectedValue(new Error("network"));

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("?fresh=true"));
    // readStateJson catches parse errors and returns empty state, so result is 200
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agents24h.every((v: number) => v === 0)).toBe(true);
    expect(data.issuesCompleted7d.every((v: number) => v === 0)).toBe(true);
  });
});
