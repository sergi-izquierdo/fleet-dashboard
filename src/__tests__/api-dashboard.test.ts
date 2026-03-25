import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";
import * as apiCache from "@/lib/apiCache";

// Mock execFileAsync so tmux calls don't hit the real system
vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: vi.fn().mockRejectedValue(new Error("no server running")),
}));

// Mock fs.accessSync so tmux existence check fails in tests
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    accessSync: vi.fn(() => {
      throw new Error("ENOENT");
    }),
  };
});

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/dashboard${query}`);
}

beforeEach(() => {
  mockFetch.mockReset();
  apiCache.clear();
});

describe("GET /api/dashboard", () => {
  it("returns data from real sources", async () => {
    // GitHub PR fetch returns empty list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.agents)).toBe(true);
    expect(Array.isArray(data.prs)).toBe(true);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns empty data when all real sources are unavailable", async () => {
    // GitHub PR fetch fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
    expect(Array.isArray(data.prs)).toBe(true);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns empty data on GitHub fetch timeout (abort)", async () => {
    mockFetch.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
  });
});

describe("GET /api/dashboard caching", () => {
  it("uses separate cache keys for different repos", async () => {
    // First request with repo param — mock returns one PR
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          number: 1,
          html_url: "https://github.com/test/repo/pull/1",
          title: "feat: test",
          user: { login: "agent" },
          head: { ref: "feat/test", sha: null },
          state: "open",
          merged_at: null,
        },
      ],
    });
    await GET(makeRequest("?repo=sergi-izquierdo/fleet-dashboard"));

    // Second request without repo param should NOT use the cached repo-specific data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.prs).toHaveLength(0);
  });

  it("returns cached data on second request without fresh param", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await GET(makeRequest());
    // Second call — fetch should not be called again
    mockFetch.mockReset();
    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
