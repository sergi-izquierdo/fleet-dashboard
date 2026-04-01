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

// Import after mocking
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

function simulateFetch(results: Map<string, { ok: boolean; status: number }>) {
  mockFetch.mockImplementation((url: string) => {
    const result = results.get(url);
    if (result) {
      return Promise.resolve({ ok: result.ok, status: result.status });
    }
    return Promise.reject(new Error("Connection refused"));
  });
}

describe("/api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy when all services are up", async () => {
    simulateExec(null, "main: 1 windows (created Mon Mar 23 10:00:00 2026)");
    simulateFetch(
      new Map([
        ["http://localhost:4100", { ok: true, status: 200 }],
        ["http://localhost:3050", { ok: true, status: 200 }],
      ])
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.services.tmux.status).toBe("up");
    expect(body.services.observability.status).toBe("up");
    expect(body.services.langfuse.status).toBe("up");
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when some services are down", async () => {
    simulateExec(null, "main: 1 windows");
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.services.tmux.status).toBe("up");
    expect(body.services.observability.status).toBe("down");
    expect(body.services.langfuse.status).toBe("down");
  });

  it("returns unhealthy when all services are down", async () => {
    simulateExec(new Error("no server running on /tmp/tmux-1000/default"));
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.services.tmux.status).toBe("down");
    expect(body.services.observability.status).toBe("down");
    expect(body.services.langfuse.status).toBe("down");
  });

  it("handles services returning non-ok status codes", async () => {
    simulateExec(null, "main: 1 windows");
    simulateFetch(
      new Map([
        ["http://localhost:4100", { ok: true, status: 200 }],
        ["http://localhost:3050", { ok: false, status: 502 }],
      ])
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.services.tmux.status).toBe("up");
    expect(body.services.observability.status).toBe("up");
    expect(body.services.langfuse.status).toBe("down");
    expect(body.services.langfuse.message).toContain("502");
  });
});
