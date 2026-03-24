import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/prs${query}`);
}

describe("GET /api/prs edge cases", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("correctly identifies closed (not merged) PRs", async () => {
    const githubPRs = [
      {
        title: "closed PR",
        number: 15,
        state: "closed",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/15",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 0,
          check_runs: [],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].status).toBe("closed");
  });

  it("sets ciStatus to unknown when no check runs found", async () => {
    const githubPRs = [
      {
        title: "no checks PR",
        number: 16,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/16",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 0,
          check_runs: [],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].ciStatus).toBe("unknown");
  });

  it("sets ciStatus to failing when check conclusion is failure", async () => {
    const githubPRs = [
      {
        title: "failing PR",
        number: 17,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/17",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 1,
          check_runs: [{ conclusion: "failure", status: "completed" }],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].ciStatus).toBe("failing");
  });

  it("sets ciStatus to pending when check is in_progress", async () => {
    const githubPRs = [
      {
        title: "in progress PR",
        number: 18,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/18",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 1,
          check_runs: [{ conclusion: null, status: "in_progress" }],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].ciStatus).toBe("pending");
  });

  it("sets ciStatus to pending when check is queued", async () => {
    const githubPRs = [
      {
        title: "queued PR",
        number: 19,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/19",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 1,
          check_runs: [{ conclusion: null, status: "queued" }],
        }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].ciStatus).toBe("pending");
  });

  it("keeps ciStatus as unknown when checks API fails", async () => {
    const githubPRs = [
      {
        title: "check failed PR",
        number: 20,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/20",
        head: { sha: "abc123" },
        user: { login: "agent-test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockRejectedValueOnce(new Error("Checks API timeout"));

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].ciStatus).toBe("unknown");
  });

  it("uses 'unknown' author when user is null", async () => {
    const githubPRs = [
      {
        title: "no author PR",
        number: 21,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/21",
        head: { sha: "abc123" },
        user: null,
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_count: 0, check_runs: [] }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].author).toBe("unknown");
  });

  it("sorts PRs by creation date descending", async () => {
    const githubPRs = [
      {
        title: "older PR",
        number: 1,
        state: "open",
        merged_at: null,
        created_at: "2026-03-20T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/1",
        head: { sha: "a" },
        user: { login: "test" },
      },
      {
        title: "newer PR",
        number: 2,
        state: "open",
        merged_at: null,
        created_at: "2026-03-23T08:00:00Z",
        html_url: "https://github.com/test/repo/pull/2",
        head: { sha: "b" },
        user: { login: "test" },
      },
    ];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubPRs,
      })
      // check runs for each PR
      .mockResolvedValue({
        ok: true,
        json: async () => ({ total_count: 0, check_runs: [] }),
      });

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data[0].title).toBe("newer PR");
    expect(data[1].title).toBe("older PR");
  });

  it("all mock PRs have required shape", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/prs/route");
    const response = await GET(makeRequest());
    const data = await response.json();

    for (const pr of data) {
      expect(pr).toHaveProperty("title");
      expect(pr).toHaveProperty("repo");
      expect(pr).toHaveProperty("status");
      expect(pr).toHaveProperty("ciStatus");
      expect(pr).toHaveProperty("createdAt");
      expect(pr).toHaveProperty("url");
      expect(pr).toHaveProperty("number");
      expect(pr).toHaveProperty("author");
      expect(["open", "merged", "closed"]).toContain(pr.status);
      expect(["passing", "failing", "pending", "unknown"]).toContain(
        pr.ciStatus
      );
    }
  });
});
