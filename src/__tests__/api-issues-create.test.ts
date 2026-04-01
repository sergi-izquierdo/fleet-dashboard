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

import { POST } from "@/app/api/issues/create/route";
import { NextRequest } from "next/server";

const VALID_CONFIG = JSON.stringify({
  projects: [
    { repo: "sergi-izquierdo/fleet-dashboard", url: "https://github.com/sergi-izquierdo/fleet-dashboard" },
    { repo: "sergi-izquierdo/synapse-notes", url: "https://github.com/sergi-izquierdo/synapse-notes" },
  ],
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/issues/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFileSync.mockReturnValue(VALID_CONFIG);
});

describe("POST /api/issues/create", () => {
  it("creates an issue successfully", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/42\n",
      stderr: "",
    });

    const response = await POST(
      makeRequest({
        repo: "sergi-izquierdo/fleet-dashboard",
        title: "Fix login bug",
        body: "The login page is broken",
        labels: ["agent-local"],
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.issueNumber).toBe(42);
    expect(data.url).toBe("https://github.com/sergi-izquierdo/fleet-dashboard/issues/42");
  });

  it("passes correct args to gh cli", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/99\n",
      stderr: "",
    });

    await POST(
      makeRequest({
        repo: "sergi-izquierdo/fleet-dashboard",
        title: "My issue",
        body: "Body text",
        labels: ["agent-local", "bug"],
      })
    );

    expect(mockExecFileAsync).toHaveBeenCalledWith("gh", [
      "issue", "create",
      "--repo", "sergi-izquierdo/fleet-dashboard",
      "--title", "My issue",
      "--body", "Body text",
      "--label", "agent-local",
      "--label", "bug",
    ]);
  });

  describe("repo validation", () => {
    it("rejects repo not in config", async () => {
      const response = await POST(
        makeRequest({
          repo: "attacker/evil-repo",
          title: "Test",
          body: "",
          labels: ["agent-local"],
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/allowed/i);
      expect(mockExecFileAsync).not.toHaveBeenCalled();
    });

    it("rejects missing repo", async () => {
      const response = await POST(
        makeRequest({ title: "Test", body: "", labels: ["agent-local"] })
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe("title validation", () => {
    it("rejects empty title", async () => {
      const response = await POST(
        makeRequest({
          repo: "sergi-izquierdo/fleet-dashboard",
          title: "",
          body: "",
          labels: ["agent-local"],
        })
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/title/i);
    });

    it("rejects title exceeding 200 characters", async () => {
      const response = await POST(
        makeRequest({
          repo: "sergi-izquierdo/fleet-dashboard",
          title: "a".repeat(201),
          body: "",
          labels: ["agent-local"],
        })
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/200/);
    });

    it("accepts title of exactly 200 characters", async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: "https://github.com/sergi-izquierdo/fleet-dashboard/issues/1\n",
        stderr: "",
      });

      const response = await POST(
        makeRequest({
          repo: "sergi-izquierdo/fleet-dashboard",
          title: "a".repeat(200),
          body: "",
          labels: ["agent-local"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("labels validation", () => {
    it("rejects missing agent-local label", async () => {
      const response = await POST(
        makeRequest({
          repo: "sergi-izquierdo/fleet-dashboard",
          title: "Test",
          body: "",
          labels: ["bug"],
        })
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/agent-local/);
    });

    it("rejects non-array labels", async () => {
      const response = await POST(
        makeRequest({
          repo: "sergi-izquierdo/fleet-dashboard",
          title: "Test",
          body: "",
          labels: "agent-local",
        })
      );
      expect(response.status).toBe(400);
    });
  });

  it("returns 500 when gh command fails", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("gh: command not found"));

    const response = await POST(
      makeRequest({
        repo: "sergi-izquierdo/fleet-dashboard",
        title: "Test",
        body: "",
        labels: ["agent-local"],
      })
    );
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("gh: command not found");
  });

  it("handles invalid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/issues/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
