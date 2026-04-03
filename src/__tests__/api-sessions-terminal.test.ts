import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import { GET } from "@/app/api/sessions/[name]/terminal/route";

function makeParams(name: string) {
  return { params: Promise.resolve({ name }) };
}

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("GET /api/sessions/[name]/terminal", () => {
  it("returns 400 for invalid session name", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("../../evil"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid session name");
    expect(body.active).toBe(false);
    expect(body.lines).toEqual([]);
  });

  it("returns lines and active:true for valid session", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "line1\nline2\nline3\n" });
    const res = await GET(new Request("http://localhost"), makeParams("agent-abc-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionName).toBe("agent-abc-1");
    expect(body.active).toBe(true);
    expect(body.lines).toContain("line1");
    expect(body.lines).toContain("line2");
    expect(body.lines).toContain("line3");
  });

  it("returns 404 when session not found", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("can't find session"));
    const res = await GET(new Request("http://localhost"), makeParams("agent-abc-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.active).toBe(false);
    expect(body.lines).toEqual([]);
    expect(body.error).toContain("not found");
  });

  it("returns 500 for unexpected errors", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("tmux crashed"));
    const res = await GET(new Request("http://localhost"), makeParams("agent-abc-1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.active).toBe(false);
  });

  it("filters trailing empty lines", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "line1\nline2\n\n\n" });
    const res = await GET(new Request("http://localhost"), makeParams("agent-abc-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    // trailing empty lines should be filtered
    const lastLine = body.lines[body.lines.length - 1];
    expect(lastLine).toBe("line2");
  });

  it("passes correct arguments to tmux capture-pane", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "output\n" });
    await GET(new Request("http://localhost"), makeParams("agent-test-42"));
    expect(mockExecFileAsync).toHaveBeenCalledWith("tmux", [
      "capture-pane",
      "-t",
      "agent-test-42",
      "-p",
      "-S",
      "-200",
    ]);
  });
});
