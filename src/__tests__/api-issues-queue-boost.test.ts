import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();
vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

const mockReadFileSync = vi.fn();
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, readFileSync: (...args: unknown[]) => mockReadFileSync(...args) };
});

import { POST } from "@/app/api/issues/queue/boost/route";
import { NextRequest } from "next/server";

const VALID_CONFIG = JSON.stringify({
  projects: [
    { repo: "sergi-izquierdo/fleet-dashboard" },
    { repo: "sergi-izquierdo/synapse-notes" },
  ],
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/issues/queue/boost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFileSync.mockReturnValue(VALID_CONFIG);
  mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });
});

describe("POST /api/issues/queue/boost", () => {
  it("boosts issue priority successfully", async () => {
    const response = await POST(
      makeRequest({ repo: "sergi-izquierdo/fleet-dashboard", issueNumber: 42 })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("calls gh with correct args to add priority comment", async () => {
    await POST(makeRequest({ repo: "sergi-izquierdo/fleet-dashboard", issueNumber: 42 }));

    expect(mockExecFileAsync).toHaveBeenCalledWith("gh", [
      "issue", "comment", "42",
      "--repo", "sergi-izquierdo/fleet-dashboard",
      "--body", "priority: high",
    ]);
  });

  it("rejects repo not in allowed list", async () => {
    const response = await POST(
      makeRequest({ repo: "attacker/evil-repo", issueNumber: 1 })
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/allowed/i);
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it("rejects missing repo", async () => {
    const response = await POST(makeRequest({ issueNumber: 1 }));
    expect(response.status).toBe(400);
  });

  it("rejects non-integer issueNumber", async () => {
    const response = await POST(
      makeRequest({ repo: "sergi-izquierdo/fleet-dashboard", issueNumber: 1.5 })
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 when gh command fails", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("gh: authentication error"));

    const response = await POST(
      makeRequest({ repo: "sergi-izquierdo/fleet-dashboard", issueNumber: 1 })
    );
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("gh: authentication error");
  });

  it("handles invalid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/issues/queue/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
