import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/issues${query}`);
}

function mockGitHub(
  responses: Record<string, { issues: Array<{ state: string; labels: Array<{ name: string }>; pull_request?: unknown }> }>
) {
  fetchMock.mockImplementation(async (url: string) => {
    const noLinkHeaders = { get: () => null };
    for (const [repoPattern, data] of Object.entries(responses)) {
      if (url.includes(repoPattern)) {
        const stateMatch = url.match(/state=(open|closed)/);
        const state = stateMatch?.[1] ?? "open";
        const filtered = data.issues.filter((i) => i.state === state);
        return { ok: true, json: async () => filtered, headers: noLinkHeaders };
      }
    }
    return { ok: false, status: 404 };
  });
}

describe("GET /api/issues", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
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
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("repos");
    expect(data.repos).toHaveLength(0);
  });

  it("returns real data when GitHub API succeeds", async () => {
    mockGitHub({
      "fleet-dashboard": {
        issues: [
          { state: "open", labels: [{ name: "agent-working" }] },
          { state: "open", labels: [{ name: "agent-local" }] },
          { state: "open", labels: [{ name: "agent-cloud" }] },
          { state: "open", labels: [], pull_request: { url: "https://..." } },
          { state: "closed", labels: [] },
          { state: "closed", labels: [{ name: "agent-working" }] },
        ],
      },
    });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);

    const repo = data.repos.find(
      (r: { repo: string }) => r.repo === "sergi-izquierdo/fleet-dashboard"
    );
    expect(repo).toBeDefined();
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
    mockGitHub({
      "fleet-dashboard": {
        issues: [
          { state: "open", labels: [{ name: "agent-working" }] },
          { state: "closed", labels: [] },
          { state: "closed", labels: [] },
        ],
      },
      "synapse-notes": {
        issues: [
          { state: "open", labels: [] },
          { state: "closed", labels: [] },
        ],
      },
    });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.overall.total).toBe(5);
    expect(data.overall.closed).toBe(3);
    expect(data.overall.percentComplete).toBe(60);
  });

  it("handles zero issues gracefully", async () => {
    mockGitHub({
      "fleet-dashboard": { issues: [] },
      "synapse-notes": { issues: [] },
      "autotask-engine": { issues: [] },
      "pavello-larapita-app": { issues: [] },
    });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repos[0].total).toBe(0);
    expect(data.repos[0].percentComplete).toBe(0);
  });

  it("returns cached result within 60 seconds", async () => {
    mockGitHub({
      "fleet-dashboard": {
        issues: [{ state: "open", labels: [] }],
      },
      "synapse-notes": { issues: [] },
      "autotask-engine": { issues: [] },
      "pavello-larapita-app": { issues: [] },
    });

    const { GET } = await import("@/app/api/issues/route");

    const first = await GET(makeRequest());
    const firstData = await first.json();
    expect(firstData.repos.length).toBeGreaterThan(0);

    const callCount = fetchMock.mock.calls.length;

    const second = await GET(makeRequest());
    const secondData = await second.json();

    // No additional fetch calls — served from cache
    expect(fetchMock.mock.calls.length).toBe(callCount);
    expect(secondData).toEqual(firstData);
  });

  it("paginates when GitHub returns a next link", async () => {
    let callCount = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("fleet-dashboard")) {
        return {
          ok: true,
          json: async () => [],
          headers: { get: () => null },
        };
      }
      const stateMatch = url.match(/state=(open|closed)/);
      const state = stateMatch?.[1] ?? "open";
      if (state === "closed") {
        return {
          ok: true,
          json: async () => [{ state: "closed", labels: [] }],
          headers: { get: () => null },
        };
      }
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => [
            { state: "open", labels: [{ name: "agent-local" }] },
          ],
          headers: {
            get: (name: string) =>
              name === "link"
                ? '<https://api.github.com/repos/sergi-izquierdo/fleet-dashboard/issues?state=open&per_page=100&page=2>; rel="next"'
                : null,
          },
        };
      }
      return {
        ok: true,
        json: async () => [
          { state: "open", labels: [{ name: "agent-working" }] },
        ],
        headers: { get: () => null },
      };
    });

    const { GET } = await import("@/app/api/issues/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    const repo = data.repos.find(
      (r: { repo: string }) => r.repo === "sergi-izquierdo/fleet-dashboard"
    );
    expect(repo).toBeDefined();
    // 2 open (paginated) + 1 closed = 3 total
    expect(repo.total).toBe(3);
    expect(repo.open).toBe(2);
    expect(repo.closed).toBe(1);
    expect(repo.labels.queued).toBe(1);
    expect(repo.labels.inProgress).toBe(1);
  });

  it("fetches all repos in parallel", async () => {
    mockGitHub({
      "fleet-dashboard": { issues: [{ state: "open", labels: [] }] },
      "synapse-notes": { issues: [{ state: "open", labels: [] }] },
      "autotask-engine": { issues: [{ state: "open", labels: [] }] },
      "pavello-larapita-app": { issues: [{ state: "open", labels: [] }] },
    });

    const { GET } = await import("@/app/api/issues/route");
    await GET(makeRequest());

    // 4 repos × 2 states (open + closed) = 8 fetch calls
    expect(fetchMock.mock.calls.length).toBe(8);
  });
});
