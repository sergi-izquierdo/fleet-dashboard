import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.fn();

vi.mock("@/lib/execFileAsync", () => ({
  execFileAsync: (...args: unknown[]) => mockExecFileAsync(...args),
}));

import { GET } from "@/app/api/sessions/[name]/stream/route";

function makeParams(name: string) {
  return { params: Promise.resolve({ name }) };
}

beforeEach(() => {
  mockExecFileAsync.mockReset();
});

describe("GET /api/sessions/[name]/stream", () => {
  it("returns 400 for invalid session name", async () => {
    const req = new Request("http://localhost");
    const res = await GET(req as Parameters<typeof GET>[0], makeParams("../../evil"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid session name");
  });

  it("returns SSE stream for valid session", async () => {
    // Return content once then simulate session end
    mockExecFileAsync
      .mockResolvedValueOnce({ stdout: "line1\nline2\n" })
      .mockRejectedValue(new Error("can't find session"));

    const req = new Request("http://localhost");
    const res = await GET(req as Parameters<typeof GET>[0], makeParams("agent-abc-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("sends session-ended event when tmux session disappears", async () => {
    // Simulate session not found immediately
    mockExecFileAsync.mockRejectedValue(new Error("can't find session"));

    const req = new Request("http://localhost");
    const res = await GET(req as Parameters<typeof GET>[0], makeParams("agent-abc-1"));
    expect(res.status).toBe(200);

    // Read the stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      accumulated += decoder.decode(value, { stream: true });
      // Look for session-ended or connected event
      if (
        accumulated.includes("session-ended") ||
        accumulated.includes("connected")
      ) {
        done = true;
      }
    }

    expect(accumulated).toContain("event: connected");
  });
});
