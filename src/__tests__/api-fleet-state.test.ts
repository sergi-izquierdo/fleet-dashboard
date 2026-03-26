import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as apiCache from "@/lib/apiCache";

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: vi.fn().mockRejectedValue(new Error("no systemctl")),
}));

import { GET } from "@/app/api/fleet-state/route";

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/fleet-state${query}`);
}

beforeEach(() => {
  mockReadFile.mockReset();
  apiCache.clear();
});

describe("GET /api/fleet-state — successRate and avgTimeToMerge", () => {
  it("returns null metrics when no completed agents", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ active: {}, completed: {} }));
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();
    expect(data.stats.successRate).toBeNull();
    expect(data.stats.avgTimeToMerge).toBeNull();
  });

  it("calculates successRate from pr_merged status", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "a/1": { repo: "org/repo", issue: 1, title: "t1", pr: "", status: "pr_merged", completedAt: "2024-01-01T01:00:00Z" },
          "a/2": { repo: "org/repo", issue: 2, title: "t2", pr: "", status: "pr_merged", completedAt: "2024-01-01T02:00:00Z" },
          "a/3": { repo: "org/repo", issue: 3, title: "t3", pr: "", status: "failed", completedAt: "2024-01-01T03:00:00Z" },
          "a/4": { repo: "org/repo", issue: 4, title: "t4", pr: "", status: "failed", completedAt: "2024-01-01T04:00:00Z" },
        },
      }),
    );
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();
    // 2 merged out of 4 total = 50%
    expect(data.stats.successRate).toBe(50);
  });

  it("calculates avgTimeToMerge in minutes from startedAt and completedAt", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "a/1": {
            repo: "org/repo", issue: 1, title: "t1", pr: "", status: "pr_merged",
            startedAt: "2024-01-01T00:00:00Z",
            completedAt: "2024-01-01T00:30:00Z", // 30 min
          },
          "a/2": {
            repo: "org/repo", issue: 2, title: "t2", pr: "", status: "pr_merged",
            startedAt: "2024-01-01T01:00:00Z",
            completedAt: "2024-01-01T01:10:00Z", // 10 min
          },
        },
      }),
    );
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();
    // avg of 30 and 10 = 20 minutes
    expect(data.stats.avgTimeToMerge).toBe(20);
  });

  it("returns null avgTimeToMerge when no startedAt fields present", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "a/1": { repo: "org/repo", issue: 1, title: "t1", pr: "", status: "pr_merged", completedAt: "2024-01-01T01:00:00Z" },
        },
      }),
    );
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();
    expect(data.stats.avgTimeToMerge).toBeNull();
  });

  it("successRate is 100 when all completed are pr_merged", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        active: {},
        completed: {
          "a/1": { repo: "org/repo", issue: 1, title: "t1", pr: "", status: "pr_merged", completedAt: "2024-01-01T01:00:00Z" },
          "a/2": { repo: "org/repo", issue: 2, title: "t2", pr: "", status: "pr_merged", completedAt: "2024-01-01T02:00:00Z" },
        },
      }),
    );
    const res = await GET(makeRequest("?fresh=true"));
    const data = await res.json();
    expect(data.stats.successRate).toBe(100);
  });
});
