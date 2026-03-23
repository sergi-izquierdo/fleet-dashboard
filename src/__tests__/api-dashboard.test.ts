import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/dashboard/route";
import { mockDashboardData } from "@/data/mockData";

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].name).toBe("agent-one");
    expect(data.prs).toHaveLength(1);
    expect(data.prs[0].number).toBe(10);
    expect(data.activityLog).toHaveLength(1);
    expect(data.activityLog[0].id).toBe("evt-001");
  });

  it("falls back to mock data when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(mockDashboardData.agents.length);
    expect(data.prs).toHaveLength(mockDashboardData.prs.length);
    expect(data.activityLog).toHaveLength(
      mockDashboardData.activityLog.length
    );
  });

  it("falls back to mock data when AO returns non-OK status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.agents[0].name).toBe(mockDashboardData.agents[0].name);
  });

  it("falls back to mock data on timeout (abort)", async () => {
    mockFetch.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(mockDashboardData.agents.length);
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

    const response = await GET();
    const result = await response.json();

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("a");
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0].number).toBe(1);
    expect(result.activityLog).toHaveLength(1);
    expect(result.activityLog[0].id).toBe("e1");
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

    const response = await GET();
    const result = await response.json();
    expect(result.agents[0].pr).toEqual({ url: "pr-url", number: 42 });
  });
});
