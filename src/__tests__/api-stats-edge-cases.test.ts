/**
 * Additional edge-case tests for API endpoints (#363):
 * - /api/stats/trends: entries with missing/null completedAt, active agents ignored
 * - /api/stats/health: all-failed agents, only timeout agents, mixed status
 * - /api/repos/health: GitHub 404 per-repo, per-repo data isolation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(path: string, query = "") {
  return new NextRequest(`http://localhost${path}${query}`);
}

const recentDate = () => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// /api/stats/trends — missing/null completedAt edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/stats/trends — missing fields", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    fetchMock.mockReset();
    apiCache.clear();
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
  });

  it("ignores completed entries with missing completedAt field", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          // No completedAt property at all
          "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "pr_merged" },
        },
      }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("/api/stats/trends", "?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    // Entry with no completedAt should be skipped — all buckets zero
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("ignores completed entries with null completedAt", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "k/1": { repo: "r", issue: 1, title: "t", pr: "", status: "pr_merged", completedAt: null },
        },
      }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("/api/stats/trends", "?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("ignores completed entries with empty-string completedAt", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "k/1": { completedAt: "" },
        },
      }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("/api/stats/trends", "?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("active agents do not contribute to agents24h counts", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {
          "k/1": { repo: "r", issue: 1, startedAt: recentDate() },
          "k/2": { repo: "r", issue: 2, startedAt: recentDate() },
        },
        completed: {},
      }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("/api/stats/trends", "?fresh=true"));
    const data = await res.json();

    // Active agents should not be counted in agents24h
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("multiple agents completing in the same hour are bucketed together", async () => {
    // All 3 agents completed ~30 min ago (same hour bucket: index 23)
    const time = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "k/1": { completedAt: time },
          "k/2": { completedAt: time },
          "k/3": { completedAt: time },
        },
      }),
    );

    const { GET } = await import("@/app/api/stats/trends/route");
    const res = await GET(makeRequest("/api/stats/trends", "?fresh=true"));
    const data = await res.json();

    expect(data.agents24h[23]).toBe(3);
    const total = (data.agents24h as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/stats/health — edge cases
// ─────────────────────────────────────────────────────────────────────────────

function makeHealthState(
  completed: Record<string, { status: string; completedAt: string }>,
) {
  return JSON.stringify({
    active: {},
    completed: Object.fromEntries(
      Object.entries(completed).map(([k, v]) => [
        k,
        { repo: "owner/repo", issue: 1, title: "t", pr: "", ...v },
      ]),
    ),
  });
}

describe("GET /api/stats/health — all-failed scenarios", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    apiCache.clear();
  });

  it("returns successRate=0 when all agents failed", async () => {
    mockReadFile.mockResolvedValue(
      makeHealthState({
        "k/1": { status: "failed", completedAt: recentDate() },
        "k/2": { status: "failed", completedAt: recentDate() },
        "k/3": { status: "failed", completedAt: recentDate() },
      }),
    );

    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("/api/stats/health", "?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(3);
    expect(data.merged).toBe(0);
    expect(data.failed).toBe(3);
    expect(data.successRate).toBe(0);
  });

  it("returns successRate=0 when all agents timed out", async () => {
    mockReadFile.mockResolvedValue(
      makeHealthState({
        "k/1": { status: "timeout", completedAt: recentDate() },
        "k/2": { status: "timeout", completedAt: recentDate() },
      }),
    );

    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("/api/stats/health", "?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(2);
    expect(data.merged).toBe(0);
    expect(data.timeout).toBe(2);
    expect(data.successRate).toBe(0);
  });

  it("returns successRate=100 when all agents merged", async () => {
    mockReadFile.mockResolvedValue(
      makeHealthState({
        "k/1": { status: "pr_merged", completedAt: recentDate() },
        "k/2": { status: "pr_merged", completedAt: recentDate() },
        "k/3": { status: "pr_merged", completedAt: recentDate() },
        "k/4": { status: "pr_merged", completedAt: recentDate() },
      }),
    );

    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("/api/stats/health", "?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(4);
    expect(data.merged).toBe(4);
    expect(data.successRate).toBe(100);
  });

  it("handles pr_created status (not merged, not failed)", async () => {
    mockReadFile.mockResolvedValue(
      makeHealthState({
        "k/1": { status: "pr_created", completedAt: recentDate() },
        "k/2": { status: "pr_merged", completedAt: recentDate() },
      }),
    );

    const { GET } = await import("@/app/api/stats/health/route");
    const res = await GET(makeRequest("/api/stats/health", "?fresh=true"));
    const data = await res.json();

    expect(data.total).toBe(2);
    expect(data.merged).toBe(1);
    // pr_created is not failed/timeout/recycled
    expect(data.failed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/repos/health — GitHub 404 per-repo, partial failures
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/repos/health — partial GitHub failures", () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    fetchMock.mockReset();
    apiCache.clear();
    vi.resetModules();
  });

  it("returns fallback data when GitHub returns 404 for a repo", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ active: {}, completed: {} }),
    );
    // All GitHub calls return 404
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("/api/repos/health", "?fresh=true"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Each repo should still appear with safe defaults
    for (const repo of data) {
      expect(repo.openIssues).toBeGreaterThanOrEqual(0);
      expect(repo.prsMerged7d).toBeGreaterThanOrEqual(0);
    }
  });

  it("healthScore stays within 0-100 when many agents failed recently", async () => {
    const failedCompletions: Record<string, unknown> = {};
    for (let i = 1; i <= 10; i++) {
      failedCompletions[`k/${i}`] = {
        repo: "sergi-izquierdo/fleet-dashboard",
        issue: i,
        title: `Bug ${i}`,
        pr: "",
        status: "failed",
        completedAt: recentDate(),
      };
    }
    mockReadFile.mockResolvedValue(
      JSON.stringify({ active: {}, completed: failedCompletions }),
    );
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("/api/repos/health", "?fresh=true"));
    const data = await res.json();

    for (const repo of data) {
      expect(repo.healthScore).toBeGreaterThanOrEqual(0);
      expect(repo.healthScore).toBeLessThanOrEqual(100);
    }

    // The fleet-dashboard repo should have a lower score due to failures
    const dashRepo = data.find(
      (r: { repo: string }) => r.repo === "sergi-izquierdo/fleet-dashboard",
    );
    expect(dashRepo).toBeDefined();
    expect(dashRepo.failedAgents7d).toBe(10);
  });
});
