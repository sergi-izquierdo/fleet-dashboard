import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock execFileAsync to avoid real gh calls
vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: vi.fn(),
}));

// Import routes and mocked module once at module level
import { POST as mergePOST } from "@/app/api/prs/merge/route";
import { POST as closePOST } from "@/app/api/prs/close/route";
import { execFileAsync } from "@/lib/execFileAsync";

const mockedExecFile = vi.mocked(execFileAsync);

// These repos are in orchestrator/config.json
const ALLOWED_REPO = "sergi-izquierdo/fleet-dashboard";
const DISALLOWED_REPO = "attacker/malicious-repo";

function makeMergeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/prs/merge", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeCloseRequest(body: unknown) {
  return new NextRequest("http://localhost/api/prs/close", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/prs/merge", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("returns 403 when repo is not in allowlist", async () => {
    const response = await mergePOST(makeMergeRequest({ repo: DISALLOWED_REPO, prNumber: 1 }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/not in the allowed config/);
  });

  it("returns 400 when repo is missing", async () => {
    const response = await mergePOST(makeMergeRequest({ prNumber: 1 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Missing required fields/);
  });

  it("returns 400 when prNumber is missing", async () => {
    const response = await mergePOST(makeMergeRequest({ repo: ALLOWED_REPO }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Missing required fields/);
  });

  it("returns 400 when prNumber is a string instead of number", async () => {
    const response = await mergePOST(makeMergeRequest({ repo: ALLOWED_REPO, prNumber: "42" }));
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("returns success and calls gh with correct args when repo is allowed", async () => {
    mockedExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

    const response = await mergePOST(makeMergeRequest({ repo: ALLOWED_REPO, prNumber: 42 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/#42/);
    expect(mockedExecFile).toHaveBeenCalledWith("/usr/bin/gh", [
      "pr", "merge", "42", "--repo", ALLOWED_REPO, "--squash", "--auto",
    ]);
  });

  it("returns 409 when PR is already merged", async () => {
    mockedExecFile.mockRejectedValueOnce(
      new Error("Pull request #42 has already been merged")
    );

    const response = await mergePOST(makeMergeRequest({ repo: ALLOWED_REPO, prNumber: 42 }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already been merged/);
  });

  it("returns 500 on generic gh failure", async () => {
    mockedExecFile.mockRejectedValueOnce(new Error("network error"));

    const response = await mergePOST(makeMergeRequest({ repo: ALLOWED_REPO, prNumber: 42 }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/network error/);
  });

  it("accepts another allowed repo from config", async () => {
    mockedExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

    const response = await mergePOST(makeMergeRequest({ repo: "sergi-izquierdo/synapse-notes", prNumber: 5 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("POST /api/prs/close", () => {
  beforeEach(() => {
    mockedExecFile.mockReset();
  });

  it("returns 403 when repo is not in allowlist", async () => {
    const response = await closePOST(makeCloseRequest({ repo: DISALLOWED_REPO, prNumber: 1 }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/not in the allowed config/);
  });

  it("returns 400 when prNumber is missing", async () => {
    const response = await closePOST(makeCloseRequest({ repo: ALLOWED_REPO }));
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("returns success and calls gh with correct args", async () => {
    mockedExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

    const response = await closePOST(makeCloseRequest({ repo: ALLOWED_REPO, prNumber: 7 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/#7/);
    expect(mockedExecFile).toHaveBeenCalledWith("/usr/bin/gh", [
      "pr", "close", "7", "--repo", ALLOWED_REPO,
    ]);
  });

  it("returns 409 when PR is already closed", async () => {
    mockedExecFile.mockRejectedValueOnce(
      new Error("Pull request is already closed")
    );

    const response = await closePOST(makeCloseRequest({ repo: ALLOWED_REPO, prNumber: 7 }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already closed/);
  });

  it("returns 500 on generic gh failure", async () => {
    mockedExecFile.mockRejectedValueOnce(new Error("unexpected error"));

    const response = await closePOST(makeCloseRequest({ repo: ALLOWED_REPO, prNumber: 7 }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/unexpected error/);
  });

  it("accepts another allowed repo from config", async () => {
    mockedExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

    const response = await closePOST(makeCloseRequest({ repo: "sergi-izquierdo/autotask-engine", prNumber: 3 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
