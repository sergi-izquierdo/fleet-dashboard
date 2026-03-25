import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock fetch globally before importing the route
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/pr-trend${query}`);
}

describe("GET /api/pr-trend", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("returns empty data and repos array when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/pr-trend/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("repos");
    expect(Array.isArray(data.data)).toBe(true);
    expect(Array.isArray(data.repos)).toBe(true);
  });

  it("returns 14 data entries when GitHub returns empty results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/pr-trend/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(14);
    expect(data.repos.length).toBeGreaterThan(0);
  });

  it("counts merged PRs per date when GitHub API returns merged PRs", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { merged_at: `${today}T10:00:00Z` },
        { merged_at: `${today}T14:00:00Z` },
        { merged_at: `${yesterday}T09:00:00Z` },
        { merged_at: null }, // not merged — should be excluded
      ],
    });

    const { GET } = await import("@/app/api/pr-trend/route");
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(14);

    const todayEntry = body.data.find((e: { date: string }) => e.date === today);
    expect(todayEntry).toBeDefined();
    // Each repo gets 2 PRs today (fetchMock returns same data for all repos)
    const repoName = body.repos[0];
    expect(typeof todayEntry[repoName]).toBe("number");
    expect(todayEntry[repoName]).toBeGreaterThan(0);
  });

  it("handles non-OK GitHub API response gracefully", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { GET } = await import("@/app/api/pr-trend/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(14);
  });

  it("uses cached response on second call", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/pr-trend/route");

    await GET(makeRequest());
    const callsAfterFirst = fetchMock.mock.calls.length;

    // Second call without fresh param should use cache
    await GET(makeRequest());
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it("bypasses cache when fresh=true", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/pr-trend/route");

    await GET(makeRequest());
    const callsAfterFirst = fetchMock.mock.calls.length;

    // Second call with fresh=true should re-fetch
    await GET(makeRequest("?fresh=true"));
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
