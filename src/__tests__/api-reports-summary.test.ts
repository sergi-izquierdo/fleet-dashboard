import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));
vi.mock("path", async () => {
  const actual = await vi.importActual<typeof import("path")>("path");
  return actual;
});
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return actual;
});

function makeRequest() {
  return new NextRequest("http://localhost/api/reports/summary");
}

describe("GET /api/reports/summary", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReadFile.mockReset();
  });

  it("returns zero counts when all files are missing", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalAgents).toBe(0);
    expect(body.totalPrsCreated).toBe(0);
    expect(body.totalPrsMerged).toBe(0);
    expect(body.successRate).toBeNull();
    expect(body.mostActiveProject).toBeNull();
    expect(body.busiestDay).toBeNull();
    expect(body.avgDurationMinutes).toBeNull();
  });

  it("counts agents from state.json completed section", async () => {
    const state = {
      completed: {
        "agent-A": {
          repo: "org/project",
          issue: 1,
          title: "Fix A",
          pr: "https://github.com/org/project/pull/1",
          status: "pr_merged",
          completedAt: "2026-04-01T10:00:00Z",
          startedAt: "2026-04-01T09:00:00Z",
        },
        "agent-B": {
          repo: "org/project",
          issue: 2,
          title: "Fix B",
          pr: "",
          status: "error",
          completedAt: "2026-04-02T10:00:00Z",
          startedAt: "2026-04-02T09:30:00Z",
        },
      },
    };

    // state.json succeeds, archive and costs fail
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(state)) // state.json
      .mockRejectedValueOnce(new Error("ENOENT"))   // archive
      .mockRejectedValueOnce(new Error("ENOENT"));  // costs

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.totalAgents).toBe(2);
    expect(body.totalPrsMerged).toBe(1);
    expect(body.totalPrsCreated).toBe(1);
    expect(body.successRate).toBe(50);
  });

  it("counts agents from archive when present", async () => {
    const archiveLine1 = JSON.stringify({
      _key: "agent-C",
      repo: "org/project",
      issue: 3,
      title: "Fix C",
      pr: "https://github.com/org/project/pull/3",
      status: "pr_merged",
      _archivedAt: "2026-03-15T12:00:00Z",
    });
    const archiveLine2 = JSON.stringify({
      _key: "agent-D",
      repo: "org/project",
      issue: 4,
      title: "Fix D",
      pr: "https://github.com/org/project/pull/4",
      status: "pr_created",
      _archivedAt: "2026-03-16T12:00:00Z",
    });

    // state.json fails, archive returns 2 lines, costs fail
    mockReadFile
      .mockRejectedValueOnce(new Error("ENOENT"))        // state.json
      .mockResolvedValueOnce(`${archiveLine1}\n${archiveLine2}\n`) // archive
      .mockRejectedValueOnce(new Error("ENOENT"));       // costs

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.totalAgents).toBe(2);
    expect(body.totalPrsMerged).toBe(1);
    expect(body.totalPrsCreated).toBe(2);
  });

  it("identifies the most active project from costs file", async () => {
    const costsContent = [
      '{"timestamp":"2026-04-01T10:00:00Z","session_id":"s1","agent_name":"agent-fleet-dashboard-1","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/a.jsonl","transcript_lines":10}',
      '{"timestamp":"2026-04-01T11:00:00Z","session_id":"s2","agent_name":"agent-fleet-dashboard-2","model":"sonnet","cwd":"/tmp","transcript_path":"/tmp/b.jsonl","transcript_lines":20}',
      '{"timestamp":"2026-04-01T12:00:00Z","session_id":"s3","agent_name":"agent-cardmarket-1","model":"haiku","cwd":"/tmp","transcript_path":"/tmp/c.jsonl","transcript_lines":5}',
    ].join("\n");

    mockReadFile
      .mockRejectedValueOnce(new Error("ENOENT")) // state.json
      .mockRejectedValueOnce(new Error("ENOENT")) // archive
      .mockResolvedValueOnce(costsContent);        // costs

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.mostActiveProject).toBe("fleet-dashboard");
  });

  it("identifies the busiest day", async () => {
    const archiveLines = [
      JSON.stringify({ _key: "a1", repo: "org/p", issue: 1, title: "T", pr: "", status: "pr_merged", _archivedAt: "2026-04-01T10:00:00Z" }),
      JSON.stringify({ _key: "a2", repo: "org/p", issue: 2, title: "T", pr: "", status: "pr_merged", _archivedAt: "2026-04-01T12:00:00Z" }),
      JSON.stringify({ _key: "a3", repo: "org/p", issue: 3, title: "T", pr: "", status: "pr_merged", _archivedAt: "2026-04-02T10:00:00Z" }),
    ].join("\n");

    mockReadFile
      .mockRejectedValueOnce(new Error("ENOENT")) // state.json
      .mockResolvedValueOnce(archiveLines)          // archive
      .mockRejectedValueOnce(new Error("ENOENT")); // costs

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.busiestDay).toBe("2026-04-01");
  });

  it("computes average duration from agents with startedAt and completedAt", async () => {
    const state = {
      completed: {
        "agent-X": {
          repo: "org/p",
          issue: 1,
          title: "T",
          pr: "",
          status: "pr_merged",
          completedAt: "2026-04-01T10:30:00Z",
          startedAt: "2026-04-01T10:00:00Z", // 30 min
        },
        "agent-Y": {
          repo: "org/p",
          issue: 2,
          title: "T",
          pr: "",
          status: "pr_merged",
          completedAt: "2026-04-01T11:10:00Z",
          startedAt: "2026-04-01T11:00:00Z", // 10 min
        },
      },
    };

    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(state)) // state.json
      .mockRejectedValueOnce(new Error("ENOENT"))   // archive
      .mockRejectedValueOnce(new Error("ENOENT"));  // costs

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.avgDurationMinutes).toBe(20); // (30 + 10) / 2
  });

  it("returns 100% success rate when all agents merged", async () => {
    const state = {
      completed: {
        "agent-Z": {
          repo: "org/p",
          issue: 1,
          title: "T",
          pr: "https://github.com/org/p/pull/1",
          status: "pr_merged",
          completedAt: "2026-04-01T10:00:00Z",
        },
      },
    };

    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(state))
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockRejectedValueOnce(new Error("ENOENT"));

    const { GET } = await import("@/app/api/reports/summary/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.successRate).toBe(100);
  });
});
