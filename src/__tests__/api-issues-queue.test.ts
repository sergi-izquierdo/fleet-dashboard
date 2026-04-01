import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockReadFileSync = vi.fn();
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, readFileSync: (...args: unknown[]) => mockReadFileSync(...args) };
});

const mockApiCacheGet = vi.fn();
const mockApiCacheSet = vi.fn();
vi.mock("@/lib/apiCache", () => ({
  get: (...args: unknown[]) => mockApiCacheGet(...args),
  set: (...args: unknown[]) => mockApiCacheSet(...args),
}));

import { GET } from "@/app/api/issues/queue/route";

const VALID_CONFIG = JSON.stringify({
  projects: [
    { repo: "sergi-izquierdo/fleet-dashboard" },
    { repo: "sergi-izquierdo/synapse-notes" },
  ],
});

function makeGitHubIssue(overrides: Partial<{
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  created_at: string;
  html_url: string;
  state: string;
  pull_request: unknown;
}> = {}) {
  return {
    number: 1,
    title: "Test issue",
    labels: [{ name: "agent-local" }],
    created_at: "2024-01-01T00:00:00Z",
    html_url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/1",
    state: "open",
    ...overrides,
  };
}

function mockGitHubResponse(issues: unknown[]) {
  return {
    ok: true,
    json: () => Promise.resolve(issues),
    headers: { get: () => null },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockReadFileSync.mockImplementation(() => VALID_CONFIG);
  mockApiCacheGet.mockReturnValue(null);
  // Default: all repos return empty
  mockFetch.mockResolvedValue(mockGitHubResponse([]));
});

describe("GET /api/issues/queue", () => {
  it("returns queued issues sorted by createdAt ascending", async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("fleet-dashboard")) {
        return Promise.resolve(
          mockGitHubResponse([
            makeGitHubIssue({
              number: 2,
              title: "Newer issue",
              created_at: "2024-03-01T00:00:00Z",
              html_url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/2",
            }),
          ])
        );
      }
      if (typeof url === "string" && url.includes("synapse-notes")) {
        return Promise.resolve(
          mockGitHubResponse([
            makeGitHubIssue({
              number: 1,
              title: "Older issue",
              created_at: "2024-01-01T00:00:00Z",
              html_url: "https://github.com/sergi-izquierdo/synapse-notes/issues/1",
            }),
          ])
        );
      }
      return Promise.resolve(mockGitHubResponse([]));
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const data: { issues: Array<{ repo: string; number: number; title: string; createdAt: string }> } = await response.json();

    // Issues from fleet-dashboard and synapse-notes should be present
    const fdIssue = data.issues.find((i) => i.repo === "sergi-izquierdo/fleet-dashboard");
    const snIssue = data.issues.find((i) => i.repo === "sergi-izquierdo/synapse-notes");
    expect(fdIssue).toBeDefined();
    expect(snIssue).toBeDefined();

    // Issues should be sorted oldest first
    for (let i = 1; i < data.issues.length; i++) {
      expect(new Date(data.issues[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(data.issues[i].createdAt).getTime()
      );
    }
    // The synapse-notes (older) issue should come before fleet-dashboard (newer)
    const fdIdx = data.issues.findIndex((i) => i.repo === "sergi-izquierdo/fleet-dashboard");
    const snIdx = data.issues.findIndex((i) => i.repo === "sergi-izquierdo/synapse-notes");
    expect(snIdx).toBeLessThan(fdIdx);
  });

  it("maps issue fields correctly", async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("fleet-dashboard")) {
        return Promise.resolve(
          mockGitHubResponse([
            makeGitHubIssue({
              number: 42,
              title: "Fix login bug",
              labels: [{ name: "agent-local" }, { name: "bug" }],
              created_at: "2024-06-15T12:00:00Z",
              html_url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/42",
            }),
          ])
        );
      }
      return Promise.resolve(mockGitHubResponse([]));
    });

    const response = await GET();
    const data: { issues: Array<{ repo: string; number: number; title: string; labels: string[]; createdAt: string; url: string }> } = await response.json();

    const issue = data.issues.find((i) => i.number === 42);
    expect(issue).toBeDefined();
    expect(issue?.repo).toBe("sergi-izquierdo/fleet-dashboard");
    expect(issue?.number).toBe(42);
    expect(issue?.title).toBe("Fix login bug");
    expect(issue?.labels).toEqual(["agent-local", "bug"]);
    expect(issue?.createdAt).toBe("2024-06-15T12:00:00Z");
    expect(issue?.url).toBe("https://github.com/sergi-izquierdo/fleet-dashboard/issues/42");
  });

  it("excludes pull requests from results", async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("fleet-dashboard")) {
        return Promise.resolve(
          mockGitHubResponse([
            makeGitHubIssue({ number: 1, title: "Real issue" }),
            makeGitHubIssue({ number: 2, title: "A PR", pull_request: { url: "https://..." } }),
          ])
        );
      }
      return Promise.resolve(mockGitHubResponse([]));
    });

    const response = await GET();
    const data: { issues: Array<{ number: number }> } = await response.json();

    expect(data.issues.every((i) => i.number !== 2)).toBe(true);
    expect(data.issues.some((i) => i.number === 1)).toBe(true);
  });

  it("fetches from all configured repos", async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("fleet-dashboard")) {
        return Promise.resolve(
          mockGitHubResponse([makeGitHubIssue({ number: 10, html_url: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/10" })])
        );
      }
      if (typeof url === "string" && url.includes("synapse-notes")) {
        return Promise.resolve(
          mockGitHubResponse([makeGitHubIssue({ number: 20, html_url: "https://github.com/sergi-izquierdo/synapse-notes/issues/20" })])
        );
      }
      return Promise.resolve(mockGitHubResponse([]));
    });

    const response = await GET();
    const data: { issues: Array<{ repo: string }> } = await response.json();

    const repos = data.issues.map((i) => i.repo);
    expect(repos).toContain("sergi-izquierdo/fleet-dashboard");
    expect(repos).toContain("sergi-izquierdo/synapse-notes");
  });

  it("returns empty issues array when all repos have no queued issues", async () => {
    // mockFetch defaults to returning empty array (set in beforeEach)
    const response = await GET();
    expect(response.status).toBe(200);
    const data: { issues: unknown[] } = await response.json();
    expect(data.issues).toEqual([]);
  });

  it("returns cached data when available", async () => {
    const cachedData = { issues: [{ repo: "test/repo", number: 1, title: "cached", labels: [], createdAt: "2024-01-01T00:00:00Z", url: "" }] };
    mockApiCacheGet.mockReturnValue(cachedData);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual(cachedData);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("continues fetching other repos when one fails", async () => {
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("fleet-dashboard")) {
        return Promise.reject(new Error("Network error"));
      }
      if (typeof url === "string" && url.includes("synapse-notes")) {
        return Promise.resolve(
          mockGitHubResponse([makeGitHubIssue({ number: 5, html_url: "https://github.com/sergi-izquierdo/synapse-notes/issues/5" })])
        );
      }
      return Promise.resolve(mockGitHubResponse([]));
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const data: { issues: Array<{ repo: string }> } = await response.json();

    // Should still have results from the successful repo
    expect(data.issues.some((i) => i.repo === "sergi-izquierdo/synapse-notes")).toBe(true);
  });
});
