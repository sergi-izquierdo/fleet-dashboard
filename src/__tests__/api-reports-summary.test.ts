import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

import { GET } from "@/app/api/reports/summary/route";

function makeRequest() {
  return new NextRequest("http://localhost/api/reports/summary");
}

const stateWithAgents = JSON.stringify({
  active: {},
  completed: {
    "agent-fle-10": {
      repo: "sergi/fleet-dashboard",
      issue: 10,
      title: "Feature A",
      pr: "https://github.com/sergi/fleet-dashboard/pull/10",
      status: "pr_merged",
      startedAt: "2024-03-01T10:00:00Z",
      completedAt: "2024-03-01T11:00:00Z",
    },
    "agent-fle-11": {
      repo: "sergi/fleet-dashboard",
      issue: 11,
      title: "Feature B",
      pr: "https://github.com/sergi/fleet-dashboard/pull/11",
      status: "pr_merged",
      startedAt: "2024-03-01T12:00:00Z",
      completedAt: "2024-03-01T13:30:00Z",
    },
    "agent-fle-12": {
      repo: "sergi/fleet-dashboard",
      issue: 12,
      title: "Bug C",
      pr: "",
      status: "failed",
      startedAt: "2024-03-02T09:00:00Z",
      completedAt: "2024-03-02T09:15:00Z",
    },
  },
});

const costsContent = [
  JSON.stringify({ timestamp: "2024-03-01T10:00:00Z", agent_name: "agent-fle-10", model: "claude-3", cwd: "/home/sergi/projects/fleet-dashboard/.worktrees/issue-10", transcript_lines: 100, session_id: "s1", transcript_path: "" }),
  JSON.stringify({ timestamp: "2024-03-02T09:00:00Z", agent_name: "agent-other-5", model: "claude-3", cwd: "/home/sergi/projects/other/.worktrees/issue-5", transcript_lines: 50, session_id: "s2", transcript_path: "" }),
].join("\n");

beforeEach(() => {
  mockReadFile.mockReset();
});

describe("GET /api/reports/summary", () => {
  it("returns zero counts when state is empty", async () => {
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ active: {}, completed: {} }))
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalAgents).toBe(0);
    expect(data.successRate).toBeNull();
    expect(data.mostActiveProject).toBeNull();
    expect(data.avgDurationMinutes).toBeNull();
  });

  it("counts total agents from merged state and costs", async () => {
    mockReadFile
      .mockResolvedValueOnce(stateWithAgents)
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.totalAgents).toBe(3);
  });

  it("counts PRs created and merged", async () => {
    mockReadFile
      .mockResolvedValueOnce(stateWithAgents)
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.totalPRsCreated).toBe(2);
    expect(data.totalPRsMerged).toBe(2);
  });

  it("calculates success rate", async () => {
    mockReadFile
      .mockResolvedValueOnce(stateWithAgents)
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    const data = await res.json();
    // 2 success out of 3 total = 67%
    expect(data.successRate).toBe(67);
  });

  it("returns average duration in minutes", async () => {
    mockReadFile
      .mockResolvedValueOnce(stateWithAgents)
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    const data = await res.json();
    // 60min, 90min, 15min → avg = 55
    expect(data.avgDurationMinutes).toBe(55);
  });

  it("identifies the busiest day", async () => {
    mockReadFile
      .mockResolvedValueOnce(stateWithAgents)
      .mockResolvedValueOnce("");

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.busiestDay).toBe("2024-03-01");
  });

  it("identifies the most active project from costs data", async () => {
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ active: {}, completed: {} }))
      .mockResolvedValueOnce(costsContent);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.mostActiveProject).toBe("fle");
  });

  it("handles file read errors gracefully", async () => {
    mockReadFile.mockRejectedValue(new Error("File not found"));

    const res = await GET(makeRequest());
    // Should still return 200 with zero counts (errors caught in readStateJson/readCostsContent)
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalAgents).toBe(0);
  });
});
