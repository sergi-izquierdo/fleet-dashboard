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

function makeGitHubPR(overrides: Record<string, unknown> = {}) {
  return {
    number: 10,
    html_url: "https://github.com/test/repo/pull/10",
    title: "feat: test PR",
    state: "open",
    merged_at: null,
    user: { login: "agent-one" },
    head: { ref: "feat/test", sha: null },
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  apiCache.clear();
});

describe("GET /api/dashboard", () => {
  it("returns data from real sources when GitHub succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeGitHubPR()],
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    // tmux is mocked to fail, so agents is empty
    expect(data.agents).toHaveLength(0);
    expect(data.prs).toHaveLength(1);
    expect(data.prs[0].number).toBe(10);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns empty prs when GitHub fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
    expect(Array.isArray(data.prs)).toBe(true);
    expect(data.prs).toHaveLength(0);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns empty arrays when all sources are unavailable", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
    expect(Array.isArray(data.prs)).toBe(true);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns cached data on subsequent requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGitHubPR()],
    });

    await GET(makeRequest());
    const response2 = await GET(makeRequest());
    const data = await response2.json();

    expect(response2.status).toBe(200);
    expect(data.prs).toHaveLength(1);
    // fetch should only have been called once (cache hit on second request)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/dashboard repo handling", () => {
  it("uses separate cache keys for different repos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeGitHubPR({ number: 99 })],
    });
    await GET(makeRequest("?repo=sergi-izquierdo/fleet-dashboard"));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.prs).toHaveLength(0);
  });

  it("fetches PRs for specified valid repo", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeGitHubPR({ number: 5 })],
    });

    const response = await GET(
      makeRequest("?repo=sergi-izquierdo/fleet-dashboard")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prs).toHaveLength(1);
    expect(data.prs[0].number).toBe(5);

    const githubCallUrl = mockFetch.mock.calls[0][0] as string;
    expect(githubCallUrl).toContain("sergi-izquierdo/fleet-dashboard");
  });

  it("bypasses cache when fresh=true", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [makeGitHubPR()],
    });

    await GET(makeRequest());
    await GET(makeRequest("?fresh=true"));

    // fresh=true bypasses the cache, so fetch is called twice
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
