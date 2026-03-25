import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import { POST } from "@/app/api/sessions/[name]/kill/route";

function makeParams(name: string) {
  return { params: Promise.resolve({ name }) };
}

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("POST /api/sessions/[name]/kill", () => {
  it("returns 200 and success:true when kill-session succeeds", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    const response = await POST(new Request("http://localhost"), makeParams("agent-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessionName).toBe("agent-1");
    expect(data.error).toBeUndefined();
    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "/usr/bin/tmux",
      ["kill-session", "-t", "agent-1"]
    );
  });

  it("returns 404 when session not found", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("can't find session agent-99"));

    const response = await POST(new Request("http://localhost"), makeParams("agent-99"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Session "agent-99" not found');
  });

  it("returns 404 when no tmux server running", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("no server running"));

    const response = await POST(new Request("http://localhost"), makeParams("agent-1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it("returns 404 for 'No such session' error", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("No such session: agent-x"));

    const response = await POST(new Request("http://localhost"), makeParams("agent-x"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it("returns 500 for unexpected errors", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("unexpected failure"));

    const response = await POST(new Request("http://localhost"), makeParams("agent-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain("unexpected failure");
  });
});
