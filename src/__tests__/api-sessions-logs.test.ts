import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import { GET } from "@/app/api/sessions/[name]/logs/route";
import { isValidSessionName } from "@/lib/sessionValidation";

function makeParams(name: string) {
  return { params: Promise.resolve({ name }) };
}

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("isValidSessionName", () => {
  it("accepts valid session names", () => {
    expect(isValidSessionName("agent-abc-1")).toBe(true);
    expect(isValidSessionName("agent-xyz-42")).toBe(true);
    expect(isValidSessionName("agent-foo-0")).toBe(true);
    expect(isValidSessionName("agent-abcdefg-999")).toBe(true);
  });

  it("rejects names without agent- prefix", () => {
    expect(isValidSessionName("worker-abc-1")).toBe(false);
    expect(isValidSessionName("abc-1")).toBe(false);
  });

  it("rejects names without trailing number", () => {
    expect(isValidSessionName("agent-abc")).toBe(false);
    expect(isValidSessionName("agent-abc-")).toBe(false);
  });

  it("rejects names with uppercase letters", () => {
    expect(isValidSessionName("agent-ABC-1")).toBe(false);
    expect(isValidSessionName("Agent-abc-1")).toBe(false);
  });

  it("rejects names with special characters", () => {
    expect(isValidSessionName("agent-a;b-1")).toBe(false);
    expect(isValidSessionName("agent-a$b-1")).toBe(false);
    expect(isValidSessionName("agent-a b-1")).toBe(false);
    expect(isValidSessionName("$(evil-cmd)")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidSessionName("")).toBe(false);
  });

  it("rejects name with path traversal attempts", () => {
    expect(isValidSessionName("agent-../etc-1")).toBe(false);
  });
});

describe("GET /api/sessions/[name]/logs", () => {
  it("returns lines array for valid session", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "line one\nline two\nline three\n",
      stderr: "",
    });

    const response = await GET(new Request("http://localhost"), makeParams("agent-abc-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionName).toBe("agent-abc-1");
    expect(data.lines).toEqual(["line one", "line two", "line three"]);
  });

  it("calls tmux capture-pane with correct arguments", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await GET(new Request("http://localhost"), makeParams("agent-test-7"));

    expect(mockExecFileAsync).toHaveBeenCalledWith("tmux", [
      "capture-pane",
      "-t",
      "agent-test-7",
      "-p",
      "-S",
      "-50",
    ]);
  });

  it("returns 400 for invalid session name", async () => {
    const response = await GET(new Request("http://localhost"), makeParams("evil;cmd-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it("returns 400 for session name not matching pattern", async () => {
    const response = await GET(new Request("http://localhost"), makeParams("myagent-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it("returns 404 when session not found", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("can't find session: agent-gone-1"));

    const response = await GET(new Request("http://localhost"), makeParams("agent-gone-1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns 500 on unexpected tmux failure", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("unexpected failure"));

    const response = await GET(new Request("http://localhost"), makeParams("agent-err-9"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it("returns empty lines array for empty output", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    const response = await GET(new Request("http://localhost"), makeParams("agent-empty-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lines).toEqual([]);
  });

  it("filters trailing empty lines", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "line one\nline two\n\n\n",
      stderr: "",
    });

    const response = await GET(new Request("http://localhost"), makeParams("agent-trail-2"));
    const data = await response.json();

    expect(data.lines).toEqual(["line one", "line two"]);
  });
});
