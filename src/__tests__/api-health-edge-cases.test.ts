import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process.exec and execFile
const mockExec = vi.fn();
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    default: {
      ...actual,
      exec: (...args: unknown[]) => mockExec(...args),
      execFile: (...args: unknown[]) => mockExec(...args),
    },
    exec: (...args: unknown[]) => mockExec(...args),
    execFile: (...args: unknown[]) => mockExec(...args),
  };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/health/route";

function simulateExec(error: Error | null, stdout = "") {
  mockExec.mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1] as (
      err: Error | null,
      stdout: string,
      stderr: string
    ) => void;
    callback(error, stdout, "");
  });
}

describe("/api/health edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes a valid ISO timestamp in the response", async () => {
    simulateExec(null, "main: 1 windows");
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    const timestamp = new Date(body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it("reports tmux session count in message when up", async () => {
    simulateExec(
      null,
      "agent-1: 1 windows\nagent-2: 2 windows\nagent-3: 1 windows"
    );
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services.tmux.status).toBe("up");
    expect(body.services.tmux.message).toContain("3");
  });

  it("includes error message when tmux is down", async () => {
    simulateExec(new Error("no server running on /tmp/tmux-1000/default"));
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services.tmux.status).toBe("down");
    expect(body.services.tmux.message).toContain("not running");
  });

  it("handles fetch rejection with error message for services", async () => {
    simulateExec(null, "main: 1 windows");
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();
    const body = await response.json();

    expect(body.services.observability.status).toBe("down");
    expect(body.services.observability.message).toContain("unreachable");
  });

  it("returns correct HTTP status for degraded state", async () => {
    simulateExec(null, "main: 1 windows");
    // Only some services fail
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("4100")) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.reject(new Error("Connection refused"));
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("degraded");
  });

  it("returns 503 HTTP status only when all services are down", async () => {
    simulateExec(new Error("tmux not found"));
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it("reports all three services in the response", async () => {
    simulateExec(null, "main: 1 windows");
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services).toHaveProperty("tmux");
    expect(body.services).toHaveProperty("observability");
    expect(body.services).toHaveProperty("langfuse");
    expect(body.services).not.toHaveProperty("ao");
  });

  it("each service has status and message fields", async () => {
    simulateExec(null, "main: 1 windows");
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    for (const service of Object.values(body.services) as Array<{
      status: string;
      message: string;
    }>) {
      expect(service).toHaveProperty("status");
      expect(service).toHaveProperty("message");
      expect(["up", "down"]).toContain(service.status);
      expect(typeof service.message).toBe("string");
    }
  });
});
