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
  it("returns transformed data on successful fetch", async () => {
    const aoResponse = {
      agents: [
        {
          name: "agent-one",
          sessionId: "sess-123",
          status: "working",
          issue: {
            title: "Test issue",
            number: 1,
            url: "https://github.com/test/repo/issues/1",
          },
          branch: "feat/test",
          timeElapsed: "5m 00s",
        },
      ],
      prs: [
        {
          number: 10,
          url: "https://github.com/test/repo/pull/10",
          title: "feat: test PR",
          ciStatus: "passing",
          reviewStatus: "approved",
          mergeState: "open",
          author: "agent-one",
          branch: "feat/test",
        },
      ],
      activityLog: [
        {
          id: "evt-001",
          timestamp: "2026-03-23T10:00:00Z",
          agentName: "agent-one",
          eventType: "commit",
          description: "Pushed 1 commit",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => aoResponse,
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].name).toBe("agent-one");
    expect(data.prs).toHaveLength(1);
    expect(data.prs[0].number).toBe(10);
    expect(data.activityLog).toHaveLength(1);
    expect(data.activityLog[0].id).toBe("evt-001");
  });

  it("returns fallback data when AO fails and no real sources available", async () => {
    // AO call fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    // GitHub PR fetch also fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
    // When AO fails, the route falls back to fetching real PRs from GitHub.
    // The GitHub fetch may succeed or fail; in both cases prs is an array.
    expect(Array.isArray(data.prs)).toBe(true);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns fallback data when AO returns non-OK status", async () => {
    // AO returns 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    // GitHub PR fetch also fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
    // When AO fails, the route falls back to fetching real PRs from GitHub.
    // The GitHub fetch may succeed or fail; in both cases prs is an array.
    expect(Array.isArray(data.prs)).toBe(true);
    expect(Array.isArray(data.activityLog)).toBe(true);
  });

  it("returns empty data on timeout (abort)", async () => {
    mockFetch.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(0);
  });
});

describe("GET /api/dashboard transformation", () => {
  it("transforms a valid AO payload into DashboardData", async () => {
    const aoResponse = {
      agents: [
        {
          name: "a",
          sessionId: "s",
          status: "working",
          issue: { title: "t", number: 1, url: "u" },
          branch: "b",
          timeElapsed: "1m",
        },
      ],
      prs: [
        {
          number: 1,
          url: "u",
          title: "t",
          ciStatus: "passing",
          reviewStatus: "pending",
          mergeState: "open",
          author: "a",
          branch: "b",
        },
      ],
      activityLog: [
        {
          id: "e1",
          timestamp: "ts",
          agentName: "a",
          eventType: "commit",
          description: "d",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => aoResponse,
    });

    const response = await GET(makeRequest());
    const result = await response.json();

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("a");
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0].number).toBe(1);
    expect(result.activityLog).toHaveLength(1);
    expect(result.activityLog[0].id).toBe("e1");
  });

  it("passes repo param to AO API when provided", async () => {
    const aoResponse = {
      agents: [],
      prs: [],
      activityLog: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => aoResponse,
    });

    await GET(makeRequest("?repo=sergi-izquierdo/fleet-dashboard"));

    const aoCallUrl = mockFetch.mock.calls[0][0];
    expect(aoCallUrl).toContain("repo=sergi-izquierdo%2Ffleet-dashboard");
  });

  it("uses separate cache keys for different repos", async () => {
    const aoResponse = {
      agents: [
        {
          name: "a",
          sessionId: "s",
          status: "working",
          issue: { title: "t", number: 1, url: "u" },
          branch: "b",
          timeElapsed: "1m",
        },
      ],
      prs: [],
      activityLog: [],
    };

    // First request with repo param — populates cache
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => aoResponse,
    });
    await GET(makeRequest("?repo=sergi-izquierdo/fleet-dashboard"));

    // Second request without repo param should NOT use the cached repo-specific data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [], prs: [], activityLog: [] }),
    });
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.agents).toHaveLength(0);
  });

  it("includes optional pr field on agent when present", async () => {
    const aoResponse = {
      agents: [
        {
          name: "a",
          sessionId: "s",
          status: "pr_open",
          issue: { title: "t", number: 1, url: "u" },
          branch: "b",
          timeElapsed: "1m",
          pr: { url: "pr-url", number: 42 },
        },
      ],
      prs: [],
      activityLog: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => aoResponse,
    });

    const response = await GET(makeRequest());
    const result = await response.json();
    expect(result.agents[0].pr).toEqual({ url: "pr-url", number: 42 });
  });
});
