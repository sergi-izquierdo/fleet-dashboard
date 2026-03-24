import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/apiCache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiCache")>("@/lib/apiCache");
  return { ...actual, clearCache: actual.clearCache };
});

function makeRequest(fresh = false): NextRequest {
  const url = fresh
    ? "http://localhost/api/issues?fresh=true"
    : "http://localhost/api/issues";
  return new NextRequest(url);
}

describe("GET /api/issues", () => {
  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    const { clearCache } = await import("@/lib/apiCache");
    clearCache();
  });

  it("returns empty data when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("repos");
    expect(data).toHaveProperty("overall");
    expect(Array.isArray(data.repos)).toBe(true);
    expect(data.repos).toHaveLength(0);
    expect(data.overall.total).toBe(0);
    expect(data.overall.percentComplete).toBe(0);
  });

  it("returns empty data when GitHub API returns non-OK status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("repos");
    expect(data.repos).toHaveLength(0);
  });

  it("returns real data when GitHub API succeeds", async () => {
    const openIssues = [
      {
        state: "open",
        labels: [{ name: "agent-working" }],
      },
      {
        state: "open",
        labels: [{ name: "agent-local" }],
      },
      {
        state: "open",
        labels: [{ name: "agent-cloud" }],
      },
      {
        state: "open",
        labels: [],
        pull_request: { url: "https://..." },
      },
    ];
    const closedIssues = [
      { state: "closed", labels: [] },
      { state: "closed", labels: [{ name: "agent-working" }] },
    ];

    // First call: open issues; Second call: closed issues
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => openIssues,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => closedIssues,
      });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repos).toHaveLength(1);

    const repo = data.repos[0];
    // PR is filtered out, so 5 real issues total (3 open + 2 closed)
    expect(repo.total).toBe(5);
    expect(repo.open).toBe(3);
    expect(repo.closed).toBe(2);
    expect(repo.percentComplete).toBe(40);
    expect(repo.labels.inProgress).toBe(1);
    expect(repo.labels.queued).toBe(1);
    expect(repo.labels.cloud).toBe(1);
    expect(repo.labels.done).toBe(2);
  });

  it("calculates overall progress across repos correctly", async () => {
    const openIssues = [
      { state: "open", labels: [{ name: "agent-working" }] },
    ];
    const closedIssues = [
      { state: "closed", labels: [] },
      { state: "closed", labels: [] },
    ];

    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => openIssues })
      .mockResolvedValueOnce({ ok: true, json: async () => closedIssues });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.overall.total).toBe(3);
    expect(data.overall.closed).toBe(2);
    expect(data.overall.percentComplete).toBe(67);
  });

  it("handles zero issues gracefully", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repos[0].total).toBe(0);
    expect(data.repos[0].percentComplete).toBe(0);
  });
});
