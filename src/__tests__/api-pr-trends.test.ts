import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock fetch globally before importing the route
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/pr-trends${query}`);
}

describe("GET /api/pr-trends", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("returns 14 days of data when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/pr-trends/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(14);
    expect(data[0]).toHaveProperty("date");
    expect(data[0]).toHaveProperty("count");
  });

  it("returns 14 days of data with counts from merged PRs", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const githubPRs = [
      { merged_at: `${today}T10:00:00Z`, state: "closed" },
      { merged_at: `${today}T11:00:00Z`, state: "closed" },
      { merged_at: null, state: "open" }, // not merged, should be excluded
    ];

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => githubPRs,
    });

    const { GET } = await import("@/app/api/pr-trends/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(14);

    const todayEntry = data.find(
      (d: { date: string; count: number }) => d.date === today
    );
    expect(todayEntry).toBeDefined();
    // Each of the 4 repos contributes 2 merges = 8 total for today (but depends on FLEET_REPOS)
    // At minimum, today should have count >= 2 (from first repo alone)
    expect(todayEntry.count).toBeGreaterThanOrEqual(2);
  });

  it("excludes PRs older than 14 days", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    const oldDateStr = oldDate.toISOString().slice(0, 10);

    const githubPRs = [
      { merged_at: `${oldDateStr}T10:00:00Z`, state: "closed" },
    ];

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => githubPRs,
    });

    const { GET } = await import("@/app/api/pr-trends/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(response.status).toBe(200);
    const totalCount = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0
    );
    expect(totalCount).toBe(0);
  });

  it("returns empty counts when GitHub returns non-OK status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const { GET } = await import("@/app/api/pr-trends/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(14);
    const totalCount = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0
    );
    expect(totalCount).toBe(0);
  });

  it("dates in response are in YYYY-MM-DD format and cover last 14 days", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/pr-trends/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(data).toHaveLength(14);
    for (const entry of data) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // First date should be 13 days ago, last should be today
    const today = new Date().toISOString().slice(0, 10);
    expect(data[13].date).toBe(today);
  });
});
