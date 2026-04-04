import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/stats/health${query}`);
}

function makeState(options: {
  completed?: Record<string, { repo: string; issue: number; title: string; pr: string; status: string; completedAt: string }>;
  recycle_counts?: Record<string, number>;
} = {}) {
  return JSON.stringify({
    active: {},
    completed: options.completed ?? {},
    ...(options.recycle_counts ? { recycle_counts: options.recycle_counts } : {}),
  });
}

const recentDate = () => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
const oldDate = () => new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago

beforeEach(() => {
  mockReadFile.mockReset();
  apiCache.clear();
});

describe("GET /api/stats/health", () => {
  it("returns 200 with correct shape", async () => {
    mockReadFile.mockResolvedValue(makeState());
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.total).toBe("number");
    expect(typeof data.merged).toBe("number");
    expect(typeof data.failed).toBe("number");
    expect(typeof data.timeout).toBe("number");
    expect(typeof data.recycled).toBe("number");
    expect(Array.isArray(data.repeatFailures)).toBe(true);
  });

  it("returns successRate null when no completions", async () => {
    mockReadFile.mockResolvedValue(makeState());
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(0);
    expect(data.successRate).toBeNull();
  });

  it("counts pr_merged status correctly", async () => {
    mockReadFile.mockResolvedValue(
      makeState({
        completed: {
          "key/1": { repo: "owner/repo", issue: 1, title: "Fix bug", pr: "", status: "pr_merged", completedAt: recentDate() },
          "key/2": { repo: "owner/repo", issue: 2, title: "Add feat", pr: "", status: "pr_merged", completedAt: recentDate() },
          "key/3": { repo: "owner/repo", issue: 3, title: "Timeout", pr: "", status: "timeout", completedAt: recentDate() },
        },
      }),
    );
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(3);
    expect(data.merged).toBe(2);
    expect(data.timeout).toBe(1);
    expect(data.failed).toBe(0);
    expect(data.recycled).toBe(0);
    expect(data.successRate).toBe(67); // Math.round(2/3 * 100)
  });

  it("counts all status types", async () => {
    mockReadFile.mockResolvedValue(
      makeState({
        completed: {
          "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "pr_merged", completedAt: recentDate() },
          "k/2": { repo: "r", issue: 2, title: "t", pr: "", status: "failed", completedAt: recentDate() },
          "k/3": { repo: "r", issue: 3, title: "t", pr: "", status: "timeout", completedAt: recentDate() },
          "k/4": { repo: "r", issue: 4, title: "t", pr: "", status: "recycled", completedAt: recentDate() },
        },
      }),
    );
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.merged).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.timeout).toBe(1);
    expect(data.recycled).toBe(1);
    expect(data.total).toBe(4);
    expect(data.successRate).toBe(25);
  });

  it("excludes completions older than 7 days", async () => {
    mockReadFile.mockResolvedValue(
      makeState({
        completed: {
          "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "pr_merged", completedAt: oldDate() },
          "k/2": { repo: "r", issue: 2, title: "t", pr: "", status: "pr_merged", completedAt: recentDate() },
        },
      }),
    );
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(1);
    expect(data.merged).toBe(1);
  });

  it("returns empty repeatFailures when no recycle_counts", async () => {
    mockReadFile.mockResolvedValue(makeState());
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.repeatFailures).toEqual([]);
  });

  it("returns repeatFailures for issues recycled 2+ times", async () => {
    mockReadFile.mockResolvedValue(
      makeState({
        completed: {
          "k/1": { repo: "owner/repo", issue: 42, title: "Bug #42", pr: "", status: "recycled", completedAt: recentDate() },
        },
        recycle_counts: {
          "k/1": 3,
          "k/2": 1, // below threshold — should be excluded
        },
      }),
    );
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.repeatFailures).toHaveLength(1);
    expect(data.repeatFailures[0].recycleCount).toBe(3);
    expect(data.repeatFailures[0].issue).toBe(42);
    expect(data.repeatFailures[0].title).toBe("Bug #42");
  });

  it("sorts repeatFailures by recycleCount descending", async () => {
    mockReadFile.mockResolvedValue(
      makeState({
        completed: {
          "k/1": { repo: "owner/repo", issue: 1, title: "A", pr: "", status: "recycled", completedAt: recentDate() },
          "k/2": { repo: "owner/repo", issue: 2, title: "B", pr: "", status: "recycled", completedAt: recentDate() },
        },
        recycle_counts: {
          "k/1": 2,
          "k/2": 5,
        },
      }),
    );
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(data.repeatFailures[0].recycleCount).toBe(5);
    expect(data.repeatFailures[1].recycleCount).toBe(2);
  });

  it("uses cache on second non-fresh request", async () => {
    mockReadFile.mockResolvedValue(makeState());
    const { GET } = await import("@/app/api/stats/health/route");
    await GET(makeRequest("?fresh=true"));
    await GET(makeRequest());

    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("handles invalid JSON gracefully and returns 200 with zeros", async () => {
    mockReadFile.mockResolvedValue("not-json{{");
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(0);
    expect(data.successRate).toBeNull();
  });

  it("handles missing state file gracefully", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));
    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("?fresh=true"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(0);
  });
});

describe("buildHealthResponse", () => {
  it("computes successRate as 100 when all are merged", async () => {
    const { buildHealthResponse } = await import("@/lib/fleetHealth");
    const result = buildHealthResponse({
      active: {},
      completed: {
        "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "pr_merged", completedAt: recentDate() },
        "k/2": { repo: "r", issue: 2, title: "t", pr: "", status: "pr_merged", completedAt: recentDate() },
      },
    });

    expect(result.successRate).toBe(100);
    expect(result.merged).toBe(2);
    expect(result.total).toBe(2);
  });

  it("computes successRate as 0 when none merged", async () => {
    const { buildHealthResponse } = await import("@/lib/fleetHealth");
    const result = buildHealthResponse({
      active: {},
      completed: {
        "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "failed", completedAt: recentDate() },
      },
    });

    expect(result.successRate).toBe(0);
  });
});
