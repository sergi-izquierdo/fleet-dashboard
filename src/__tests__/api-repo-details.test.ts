import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeRequest(repo: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/repo-details?repo=${encodeURIComponent(repo)}`
  );
}

describe("GET /api/repo-details", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("returns 400 when repo parameter is missing", async () => {
    const { GET } = await import("@/app/api/repo-details/route");
    const request = new NextRequest(
      "http://localhost:3000/api/repo-details"
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or missing repo parameter");
  });

  it("returns 400 for unmanaged repos", async () => {
    const { GET } = await import("@/app/api/repo-details/route");
    const request = makeRequest("unknown/repo");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns repo details on success", async () => {
    const mockIssues = [
      {
        number: 1,
        title: "Test issue",
        labels: [{ name: "bug" }],
        html_url: "https://github.com/test/1",
        state: "open",
      },
    ];

    const mockPulls = [
      {
        number: 10,
        title: "Test PR",
        html_url: "https://github.com/test/pull/10",
        user: { login: "user1" },
        head: { sha: "abc123" },
        created_at: "2026-03-20T10:00:00Z",
        state: "open",
        merged_at: null,
      },
    ];

    const mockClosedPulls = [
      {
        number: 5,
        title: "Merged PR",
        html_url: "https://github.com/test/pull/5",
        user: { login: "user2" },
        merged_at: "2026-03-19T10:00:00Z",
        created_at: "2026-03-18T10:00:00Z",
        state: "closed",
      },
    ];

    const mockCheckRuns = {
      total_count: 1,
      check_runs: [{ conclusion: "success", status: "completed" }],
    };

    fetchMock.mockImplementation((url: string) => {
      const urlStr = typeof url === "string" ? url : String(url);
      if (urlStr.includes("/issues?")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockIssues,
        });
      }
      if (urlStr.includes("/pulls?state=open")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPulls,
        });
      }
      if (urlStr.includes("/check-runs")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCheckRuns,
        });
      }
      if (urlStr.includes("/pulls?state=closed")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockClosedPulls,
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${urlStr}`));
    });

    const { GET } = await import("@/app/api/repo-details/route");
    const request = makeRequest("sergi-izquierdo/fleet-dashboard");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.repo).toBe("sergi-izquierdo/fleet-dashboard");
    expect(data.openIssues).toHaveLength(1);
    expect(data.openIssues[0].title).toBe("Test issue");
    expect(data.openIssues[0].labels).toEqual(["bug"]);
    expect(data.openPRs).toHaveLength(1);
    expect(data.openPRs[0].ciStatus).toBe("passing");
    expect(data.recentMergedPRs).toHaveLength(1);
    expect(data.recentMergedPRs[0].title).toBe("Merged PR");
  });

  it("returns 500 when GitHub API fails", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { GET } = await import("@/app/api/repo-details/route");
    const request = makeRequest("sergi-izquierdo/fleet-dashboard");
    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("filters out pull requests from issues", async () => {
    const mockIssues = [
      {
        number: 1,
        title: "Real issue",
        labels: [],
        html_url: "https://github.com/test/1",
        state: "open",
      },
      {
        number: 2,
        title: "PR disguised as issue",
        labels: [],
        html_url: "https://github.com/test/2",
        state: "open",
        pull_request: { url: "https://api.github.com/test/pulls/2" },
      },
    ];

    fetchMock.mockImplementation((url: string) => {
      const urlStr = typeof url === "string" ? url : String(url);
      if (urlStr.includes("/issues?")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockIssues,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    const { GET } = await import("@/app/api/repo-details/route");
    const request = makeRequest("sergi-izquierdo/fleet-dashboard");
    const response = await GET(request);
    const data = await response.json();

    expect(data.openIssues).toHaveLength(1);
    expect(data.openIssues[0].title).toBe("Real issue");
  });
});
