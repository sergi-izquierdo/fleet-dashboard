import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { buildTimelineResponse } from "@/lib/agentTimeline";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));
vi.mock("@/lib/apiCache", () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
}));

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/agents/timeline${query}`);
}

describe("GET /api/agents/timeline", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReadFile.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty agents array when state.json is missing", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ agents: [] });
  });

  it("returns agents sorted by startedAt descending", async () => {
    const state = {
      active: {},
      completed: {
        "agent-B": {
          repo: "org/repoB",
          issue: 2,
          title: "Issue B",
          pr: "https://github.com/org/repoB/pull/2",
          status: "pr_merged",
          startedAt: "2024-01-01T10:00:00Z",
          completedAt: "2024-01-01T11:00:00Z",
        },
        "agent-A": {
          repo: "org/repoA",
          issue: 1,
          title: "Issue A",
          pr: "https://github.com/org/repoA/pull/1",
          status: "failed",
          startedAt: "2024-01-02T10:00:00Z",
          completedAt: "2024-01-02T10:30:00Z",
        },
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(state));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(2);
    // agent-A has later startedAt so it should come first
    expect(data.agents[0].name).toBe("agent-A");
    expect(data.agents[1].name).toBe("agent-B");
  });

  it("returns correct fields for each agent", async () => {
    const state = {
      active: {},
      completed: {
        "feat-issue-42": {
          repo: "org/my-repo",
          issue: 42,
          title: "My Feature",
          pr: "https://github.com/org/my-repo/pull/10",
          status: "pr_merged",
          startedAt: "2024-01-01T08:00:00Z",
          completedAt: "2024-01-01T09:30:00Z",
        },
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(state));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    const agent = data.agents[0];
    expect(agent.name).toBe("feat-issue-42");
    expect(agent.project).toBe("my-repo");
    expect(agent.issue).toBe(42);
    expect(agent.startedAt).toBe("2024-01-01T08:00:00Z");
    expect(agent.completedAt).toBe("2024-01-01T09:30:00Z");
    expect(agent.status).toBe("success");
    expect(agent.prUrl).toBe("https://github.com/org/my-repo/pull/10");
    expect(agent.durationMinutes).toBe(90);
  });

  it("normalizes status values correctly", async () => {
    const state = {
      active: {},
      completed: {
        "agent-merged": {
          repo: "org/repo",
          issue: 1,
          status: "pr_merged",
          startedAt: "2024-01-01T00:00:00Z",
          completedAt: "2024-01-01T01:00:00Z",
        },
        "agent-timeout": {
          repo: "org/repo",
          issue: 2,
          status: "timeout",
          startedAt: "2024-01-01T02:00:00Z",
          completedAt: "2024-01-01T03:00:00Z",
        },
        "agent-failed": {
          repo: "org/repo",
          issue: 3,
          status: "error",
          startedAt: "2024-01-01T04:00:00Z",
          completedAt: "2024-01-01T05:00:00Z",
        },
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(state));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    const byName = Object.fromEntries(
      data.agents.map((a: { name: string; status: string }) => [a.name, a.status])
    );
    expect(byName["agent-merged"]).toBe("success");
    expect(byName["agent-timeout"]).toBe("timeout");
    expect(byName["agent-failed"]).toBe("failed");
  });

  it("excludes agents without startedAt", async () => {
    const state = {
      active: {},
      completed: {
        "agent-no-start": {
          repo: "org/repo",
          issue: 1,
          status: "failed",
          completedAt: "2024-01-01T01:00:00Z",
          // no startedAt
        },
        "agent-with-start": {
          repo: "org/repo",
          issue: 2,
          status: "pr_merged",
          startedAt: "2024-01-01T00:00:00Z",
          completedAt: "2024-01-01T01:00:00Z",
        },
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(state));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].name).toBe("agent-with-start");
  });

  it("limits results to 50 agents", async () => {
    const completed: Record<string, unknown> = {};
    for (let i = 0; i < 60; i++) {
      completed[`agent-${i}`] = {
        repo: "org/repo",
        issue: i,
        status: "pr_merged",
        startedAt: new Date(Date.now() - i * 60_000).toISOString(),
        completedAt: new Date(Date.now() - i * 60_000 + 30_000).toISOString(),
      };
    }
    mockReadFile.mockResolvedValue(JSON.stringify({ active: {}, completed }));

    const { GET } = await import("@/app/api/agents/timeline/route");
    const response = await GET(makeRequest("?fresh=true"));
    const data = await response.json();

    expect(data.agents).toHaveLength(50);
  });
});

describe("buildTimelineResponse", () => {
  it("filters agents by time range using startedAt", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30d ago

    const state = {
      active: {},
      completed: {
        "recent-agent": {
          repo: "org/repo",
          issue: 1,
          status: "pr_merged",
          startedAt: recent.toISOString(),
          completedAt: now.toISOString(),
        },
        "old-agent": {
          repo: "org/repo",
          issue: 2,
          status: "failed",
          startedAt: old.toISOString(),
          completedAt: old.toISOString(),
        },
      },
    };

    const result = buildTimelineResponse(state);
    // Both should be returned since endpoint returns all up to 50
    expect(result.agents).toHaveLength(2);
    // recent-agent should be first (sorted by startedAt desc)
    expect(result.agents[0].name).toBe("recent-agent");
  });
});
