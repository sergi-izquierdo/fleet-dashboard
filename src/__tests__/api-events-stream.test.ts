import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { formatSSEMessage } from "@/lib/sseFormat";

// Mock fs/promises — use vi.hoisted so the variable is available when vi.mock runs
const { readFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn() }));
vi.mock("fs/promises", () => ({
  default: { readFile: readFileMock },
  readFile: readFileMock,
}));

/** Read up to `maxChunks` chunks from a stream reader and return as a string. */
async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxChunks: number,
): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for (let i = 0; i < maxChunks; i++) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return text;
}

function makeRequest(signal?: AbortSignal) {
  const req = new NextRequest("http://localhost/api/events/stream");
  if (signal) {
    // Patch the signal onto the request
    Object.defineProperty(req, "signal", { value: signal, writable: false });
  }
  return req;
}

const emptyState = JSON.stringify({ active: {}, completed: {} });
const emptyDispatcher = JSON.stringify({});

describe("formatSSEMessage", () => {
  it("formats a valid SSE message", () => {
    const msg = formatSSEMessage("cycle", { finishedAt: "2024-01-01T00:00:00Z" }, "123");
    expect(msg).toBe(
      'id: 123\nevent: cycle\ndata: {"finishedAt":"2024-01-01T00:00:00Z"}\n\n',
    );
  });

  it("includes id, event, and data fields", () => {
    const msg = formatSSEMessage("connected", { timestamp: "1" }, "1");
    expect(msg).toContain("id: 1\n");
    expect(msg).toContain("event: connected\n");
    expect(msg).toContain("data: ");
    expect(msg.endsWith("\n\n")).toBe(true);
  });

  it("serializes data as JSON", () => {
    const data = { key: "agent-1", agent: { status: "working" } };
    const msg = formatSSEMessage("agent-started", data, "42");
    expect(msg).toContain(`data: ${JSON.stringify(data)}`);
  });
});

describe("GET /api/events/stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    readFileMock.mockReset();
    readFileMock.mockResolvedValue(emptyState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns SSE content-type header", async () => {
    const controller = new AbortController();
    const { GET } = await import("@/app/api/events/stream/route");

    readFileMock.mockResolvedValue(emptyState);

    const response = await GET(makeRequest(controller.signal));
    controller.abort();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
  });

  it("streams an initial connected event", async () => {
    const controller = new AbortController();
    const { GET } = await import("@/app/api/events/stream/route");

    readFileMock.mockResolvedValue(emptyState);

    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toContain("event: connected\n");
    expect(text).toContain("data: ");
    expect(text).toContain("id: ");
    expect(text).toMatch(/\n\n$/);

    controller.abort();
    reader.cancel();
  });

  it("includes valid JSON in the connected event data", async () => {
    const controller = new AbortController();
    const { GET } = await import("@/app/api/events/stream/route");

    readFileMock.mockResolvedValue(emptyState);

    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const { value } = await reader.read();
    const text = decoder.decode(value);

    const dataLine = text
      .split("\n")
      .find((line) => line.startsWith("data: "));
    expect(dataLine).toBeDefined();
    const json = JSON.parse(dataLine!.slice("data: ".length));
    expect(json).toHaveProperty("timestamp");

    controller.abort();
    reader.cancel();
  });

  it("gracefully handles missing state.json on initial read", async () => {
    const controller = new AbortController();
    const { GET } = await import("@/app/api/events/stream/route");

    readFileMock.mockRejectedValue(new Error("ENOENT: file not found"));

    const response = await GET(makeRequest(controller.signal));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);

    // Should still emit connected event
    expect(text).toContain("event: connected\n");

    controller.abort();
    reader.cancel();
  });

  it("emits cycle event when dispatcher finishedAt changes", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/events/stream/route");

    const firstDispatcher = JSON.stringify({
      cycle: { finishedAt: "2024-01-01T00:00:00Z", cycleCount: 1 },
    });
    const secondDispatcher = JSON.stringify({
      cycle: { finishedAt: "2024-01-01T00:05:00Z", cycleCount: 2 },
    });

    // Initial reads: state + dispatcher (called twice in Promise.all)
    readFileMock
      .mockResolvedValueOnce(emptyState) // state initial
      .mockResolvedValueOnce(firstDispatcher) // dispatcher initial
      .mockResolvedValueOnce(emptyState) // state poll
      .mockResolvedValueOnce(secondDispatcher); // dispatcher poll

    const controller = new AbortController();
    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Read the initial connected event
    const { value: connValue } = await reader.read();
    const connText = decoder.decode(connValue);
    expect(connText).toContain("event: connected\n");

    // Advance time to trigger a poll cycle
    await vi.advanceTimersByTimeAsync(5_000);

    const { value: pollValue } = await reader.read();
    const pollText = decoder.decode(pollValue);
    expect(pollText).toContain("event: cycle\n");
    expect(pollText).toContain("2024-01-01T00:05:00Z");

    controller.abort();
    reader.cancel();
  });

  it("emits agent-started event when agent appears in active", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/events/stream/route");

    const stateWithAgent = JSON.stringify({
      active: { "agent-1": { name: "agent-1", status: "working" } },
      completed: {},
    });

    readFileMock
      .mockResolvedValueOnce(emptyState) // initial state
      .mockResolvedValueOnce(emptyDispatcher) // initial dispatcher
      .mockResolvedValueOnce(stateWithAgent) // poll state
      .mockResolvedValueOnce(emptyDispatcher); // poll dispatcher

    const controller = new AbortController();
    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    await reader.read(); // consume connected event
    await vi.advanceTimersByTimeAsync(5_000);

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: agent-started\n");
    expect(text).toContain("agent-1");

    controller.abort();
    reader.cancel();
  });

  it("emits agent-completed event when agent moves from active to completed", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/events/stream/route");

    const stateWithActive = JSON.stringify({
      active: { "agent-1": { name: "agent-1" } },
      completed: {},
    });
    const stateWithCompleted = JSON.stringify({
      active: {},
      completed: {
        "agent-1": {
          status: "pr_merged",
          completedAt: "2024-01-01T00:00:00Z",
        },
      },
    });

    readFileMock
      .mockResolvedValueOnce(stateWithActive)
      .mockResolvedValueOnce(emptyDispatcher)
      .mockResolvedValueOnce(stateWithCompleted)
      .mockResolvedValueOnce(emptyDispatcher);

    const controller = new AbortController();
    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    await reader.read(); // consume connected event
    await vi.advanceTimersByTimeAsync(5_000);

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: agent-completed\n");
    expect(text).toContain("agent-1");

    controller.abort();
    reader.cancel();
  });

  it("emits pr-merged event when completed agent has pr_merged status", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/events/stream/route");

    const stateWithActive = JSON.stringify({
      active: { "agent-1": {} },
      completed: {},
    });
    const stateWithMerged = JSON.stringify({
      active: {},
      completed: {
        "agent-1": {
          status: "pr_merged",
          pr: "https://github.com/org/repo/pull/42",
          completedAt: "2024-01-01T00:00:00Z",
        },
      },
    });

    readFileMock
      .mockResolvedValueOnce(stateWithActive)
      .mockResolvedValueOnce(emptyDispatcher)
      .mockResolvedValueOnce(stateWithMerged)
      .mockResolvedValueOnce(emptyDispatcher);

    const controller = new AbortController();
    const response = await GET(makeRequest(controller.signal));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    await reader.read(); // consume connected event
    await vi.advanceTimersByTimeAsync(5_000);

    // Read 3 chunks: agent-completed, pr-created, pr-merged
    const text = await readChunks(reader, 3);

    // Should emit pr-created (has PR) and pr-merged (status = pr_merged)
    expect(text).toContain("event: pr-merged\n");

    controller.abort();
    reader.cancel();
  });
});
