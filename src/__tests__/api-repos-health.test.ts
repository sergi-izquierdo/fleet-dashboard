import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/repos/health${query}`);
}

function makeStateJson(options: {
  completed?: Record<string, { repo: string; issue: number; title: string; pr: string; status: string; completedAt: string }>;
} = {}) {
  return JSON.stringify({
    active: {},
    completed: options.completed ?? {},
  });
}

function makeRepoMetaResponse(openIssues: number) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ open_issues_count: openIssues }),
  });
}

function makePRsResponse(prs: Array<{ created_at: string; merged_at: string | null }>) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(prs),
  });
}

const recentDate = () => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

beforeEach(() => {
  mockReadFile.mockReset();
  mockFetch.mockReset();
  apiCache.clear();
  vi.resetModules();
});

describe("GET /api/repos/health", () => {
  it("returns 200 with array of repo health data", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    mockFetch
      .mockResolvedValueOnce(makeRepoMetaResponse(5)) // first repo meta
      .mockResolvedValueOnce(makePRsResponse([]))     // first repo PRs
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }); // remaining

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each item has required fields", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    mockFetch
      .mockResolvedValueOnce(makeRepoMetaResponse(3))
      .mockResolvedValueOnce(makePRsResponse([]))
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    const first = data[0];
    expect(typeof first.repo).toBe("string");
    expect(typeof first.openIssues).toBe("number");
    expect(typeof first.prsMerged7d).toBe("number");
    expect(typeof first.failedAgents7d).toBe("number");
    expect(typeof first.healthScore).toBe("number");
    expect(first.healthScore).toBeGreaterThanOrEqual(0);
    expect(first.healthScore).toBeLessThanOrEqual(100);
  });

  it("counts failed and timeout agents per repo from state.json", async () => {
    const failedAgent = {
      repo: "sergi-izquierdo/fleet-dashboard",
      issue: 1,
      title: "test",
      pr: "",
      status: "failed",
      completedAt: recentDate(),
    };
    mockReadFile.mockResolvedValue(makeStateJson({ completed: { "k/1": failedAgent } }));
    mockFetch
      .mockResolvedValueOnce(makeRepoMetaResponse(0))
      .mockResolvedValueOnce(makePRsResponse([]))
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    const dashboardRepo = data.find(
      (d: { repo: string }) => d.repo === "sergi-izquierdo/fleet-dashboard"
    );
    expect(dashboardRepo).toBeDefined();
    expect(dashboardRepo.failedAgents7d).toBe(1);
  });

  it("calculates prsMerged7d from GitHub API response", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    const recentPR = {
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      merged_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    };
    mockFetch
      .mockResolvedValueOnce(makeRepoMetaResponse(0))
      .mockResolvedValueOnce(makePRsResponse([recentPR]))
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    const first = data[0];
    expect(first.prsMerged7d).toBe(1);
  });

  it("returns 200 even when GitHub API fails", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns 200 with fallback when state.json is missing", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));
    mockFetch
      .mockResolvedValueOnce(makeRepoMetaResponse(2))
      .mockResolvedValueOnce(makePRsResponse([]))
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("uses cache on second non-fresh request", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    await GET(makeRequest("?fresh=true"));
    await GET(makeRequest());

    // readFile called only once (cache hit on second)
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("healthScore is within 0-100 range", async () => {
    mockReadFile.mockResolvedValue(makeStateJson());
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { GET } = await import("@/app/api/repos/health/route");
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();

    for (const repo of data) {
      expect(repo.healthScore).toBeGreaterThanOrEqual(0);
      expect(repo.healthScore).toBeLessThanOrEqual(100);
    }
  });
});
