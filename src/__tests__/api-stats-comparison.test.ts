import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/stats/comparison${query}`);
}

function makeArchiveLine(entry: {
  status: string;
  _archivedAt?: string;
  completedAt?: string;
}): string {
  return JSON.stringify({
    _key: "agent/1",
    repo: "test/repo",
    issue: 1,
    title: "Test",
    pr: "",
    ...entry,
  });
}

function archiveWith(lines: string[]): string {
  return lines.join("\n");
}

const now = Date.now();

beforeEach(() => {
  mockReadFile.mockReset();
  apiCache.clear();
  // Default: empty archive
  mockReadFile.mockResolvedValue("");
});

describe("GET /api/stats/comparison", () => {
  it("returns 200 with correct shape", async () => {
    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("current");
    expect(data).toHaveProperty("previous");
    expect(data).toHaveProperty("deltas");
    expect(data).toHaveProperty("period");
  });

  it("defaults to 7d period", async () => {
    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.period).toBe("7d");
  });

  it("accepts 24h period", async () => {
    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?period=24h&fresh=true"));
    const data = await res.json();

    expect(data.period).toBe("24h");
  });

  it("returns zeros when archive is empty", async () => {
    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(0);
    expect(data.current.failed).toBe(0);
    expect(data.current.timeout).toBe(0);
    expect(data.current.sessions).toBe(0);
    expect(data.previous.merged).toBe(0);
  });

  it("counts merged PRs in current period (7d)", async () => {
    const recentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "pr_merged", _archivedAt: recentTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(1);
    expect(data.previous.merged).toBe(0);
  });

  it("counts merged PRs in previous period", async () => {
    const previousTime = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(0);
    expect(data.previous.merged).toBe(1);
  });

  it("counts timeout as both failed and timeout", async () => {
    const recentTime = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "timeout", _archivedAt: recentTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.timeout).toBe(1);
    expect(data.current.failed).toBe(1);
    expect(data.current.sessions).toBe(1);
  });

  it("counts sessions for all entries in current period", async () => {
    const recentTime = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([
        makeArchiveLine({ status: "pr_merged", _archivedAt: recentTime }),
        makeArchiveLine({ status: "pr_created", _archivedAt: recentTime }),
        makeArchiveLine({ status: "timeout", _archivedAt: recentTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.sessions).toBe(3);
  });

  it("excludes entries older than 2 periods", async () => {
    const oldTime = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days ago
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "pr_merged", _archivedAt: oldTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(0);
    expect(data.previous.merged).toBe(0);
  });

  it("computes positive delta when current > previous", async () => {
    const currentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const previousTime = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    mockReadFile.mockResolvedValue(
      archiveWith([
        makeArchiveLine({ status: "pr_merged", _archivedAt: currentTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: currentTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(2);
    expect(data.previous.merged).toBe(1);
    expect(data.deltas.merged.delta).toBe(1);
    expect(data.deltas.merged.pct).toBe(100); // +100%
  });

  it("computes negative delta when current < previous", async () => {
    const currentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const previousTime = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([
        makeArchiveLine({ status: "pr_merged", _archivedAt: currentTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.deltas.merged.delta).toBe(-1);
    expect(data.deltas.merged.pct).toBe(-50); // -50%
  });

  it("returns null pct when previous is 0", async () => {
    const recentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "pr_merged", _archivedAt: recentTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.previous.merged).toBe(0);
    expect(data.deltas.merged.pct).toBeNull();
  });

  it("falls back to completedAt if _archivedAt missing", async () => {
    const recentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([makeArchiveLine({ status: "pr_merged", completedAt: recentTime })]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(1);
  });

  it("handles 24h period correctly", async () => {
    const recentTime = new Date(now - 6 * 60 * 60 * 1000).toISOString(); // 6h ago
    const previousTime = new Date(now - 30 * 60 * 60 * 1000).toISOString(); // 30h ago
    mockReadFile.mockResolvedValue(
      archiveWith([
        makeArchiveLine({ status: "pr_merged", _archivedAt: recentTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?period=24h&fresh=true"));
    const data = await res.json();

    expect(data.current.merged).toBe(1);
    expect(data.previous.merged).toBe(1);
  });

  it("uses cache on second request", async () => {
    const { GET } = await import("@/app/api/stats/comparison/route");
    await GET(makeRequest("?fresh=true"));
    await GET(makeRequest()); // should hit cache

    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("handles invalid JSON lines gracefully", async () => {
    const recentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([
        "invalid json{{{",
        makeArchiveLine({ status: "pr_merged", _archivedAt: recentTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    // Invalid lines throw on parse — archive read catches them per-line or at file level
    // Our implementation catches the whole file read error, returning empty
    const res = await GET(makeRequest("?fresh=true"));
    expect(res.status).toBe(200);
  });

  it("handles missing archive file gracefully", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.current.merged).toBe(0);
  });

  it("delta is zero when current equals previous", async () => {
    const currentTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const previousTime = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      archiveWith([
        makeArchiveLine({ status: "pr_merged", _archivedAt: currentTime }),
        makeArchiveLine({ status: "pr_merged", _archivedAt: previousTime }),
      ]),
    );

    const { GET } = await import("@/app/api/stats/comparison/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.deltas.merged.delta).toBe(0);
    expect(data.deltas.merged.pct).toBe(0);
  });
});
