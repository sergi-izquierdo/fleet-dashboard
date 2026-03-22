import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, transformAOResponse } from "@/app/api/dashboard/route";
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

describe("transformAOResponse", () => {
  it("transforms a valid AO payload into DashboardData", () => {
    const raw = {
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

    const result = transformAOResponse(raw);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("a");
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0].number).toBe(1);
    expect(result.activityLog).toHaveLength(1);
    expect(result.activityLog[0].id).toBe("e1");
  });

  it("returns empty arrays when fields are missing", () => {
    const result = transformAOResponse({});

    expect(result.agents).toEqual([]);
    expect(result.prs).toEqual([]);
    expect(result.activityLog).toEqual([]);
  });

  it("includes optional pr field on agent when present", () => {
    const raw = {
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

    const result = transformAOResponse(raw);
    expect(result.agents[0].pr).toEqual({ url: "pr-url", number: 42 });
  });

  it("response conforms to DashboardData shape", () => {
    const raw = {
      agents: [
        {
          name: "test",
          sessionId: "sess",
          status: "working",
          issue: { title: "Issue", number: 5, url: "http://example.com" },
          branch: "feat/test",
          timeElapsed: "10m",
        },
      ],
      prs: [],
      activityLog: [],
    };

    const result = transformAOResponse(raw);

    // Validate structure
    expect(result).toHaveProperty("agents");
    expect(result).toHaveProperty("prs");
    expect(result).toHaveProperty("activityLog");
    expect(Array.isArray(result.agents)).toBe(true);
    expect(Array.isArray(result.prs)).toBe(true);
    expect(Array.isArray(result.activityLog)).toBe(true);

    // Validate agent shape
    const agent = result.agents[0];
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("sessionId");
    expect(agent).toHaveProperty("status");
    expect(agent).toHaveProperty("issue");
    expect(agent.issue).toHaveProperty("title");
    expect(agent.issue).toHaveProperty("number");
    expect(agent.issue).toHaveProperty("url");
    expect(agent).toHaveProperty("branch");
    expect(agent).toHaveProperty("timeElapsed");
  });
});
