import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally before importing the route
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("GET /api/prs", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("returns mock data when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(13);
    // Each PR should have the expected shape
    expect(data[0]).toHaveProperty("title");
    expect(data[0]).toHaveProperty("repo");
    expect(data[0]).toHaveProperty("status");
    expect(data[0]).toHaveProperty("ciStatus");
    expect(data[0]).toHaveProperty("createdAt");
    expect(data[0]).toHaveProperty("url");
    expect(data[0]).toHaveProperty("number");
    expect(data[0]).toHaveProperty("author");
  });

  it("returns mock data when GitHub API returns empty results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.length).toBe(13);
  });

  it("returns mock data when GitHub API returns non-OK status", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(13);
  });

  it("returns GitHub data when API succeeds", async () => {
    const githubPRs = [
      {
        title: "feat: new feature",
        number: 42,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T10:00:00Z",
        html_url: "https://github.com/test/repo/pull/42",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    // First call: PR list; second call: check runs
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 1,
          check_runs: [{ conclusion: "success", status: "completed" }],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("feat: new feature");
    expect(data[0].number).toBe(42);
    expect(data[0].status).toBe("open");
    expect(data[0].ciStatus).toBe("passing");
    expect(data[0].author).toBe("agent-test");
  });

  it("correctly identifies merged PRs", async () => {
    const githubPRs = [
      {
        title: "merged PR",
        number: 10,
        state: "closed",
        merged_at: "2026-03-23T09:00:00Z",
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/10",
        head: { sha: "def456" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET();
    const data = await response.json();

    expect(data[0].status).toBe("merged");
  });
});
