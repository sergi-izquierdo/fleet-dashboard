import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process.execFile
const mockExecFile = vi.fn();
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    default: {
      ...actual,
      execFile: (...args: unknown[]) => mockExecFile(...args),
    },
    execFile: (...args: unknown[]) => mockExecFile(...args),
  };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
import { GET } from "@/app/api/health/route";

function simulateExecFile(results: Record<string, boolean>) {
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      args: string[],
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const sessionName = args[args.indexOf("-t") + 1];
      if (sessionName && results[sessionName]) {
        callback(null, "", "");
      } else {
        callback(new Error("session not found"), "", "");
      }
    },
  );
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
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    simulateFetch(
      new Map([
        ["http://localhost:3001", { ok: true, status: 200 }],
        ["http://localhost:4100", { ok: true, status: 200 }],
        ["http://localhost:5174", { ok: true, status: 200 }],
        ["http://localhost:3050", { ok: true, status: 200 }],
      ]),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.services.dashboard.status).toBe("up");
    expect(body.services.observabilityServer.status).toBe("up");
    expect(body.services.observabilityClient.status).toBe("up");
    expect(body.services.langfuse.status).toBe("up");
    expect(body.services.dispatcher.status).toBe("up");
    expect(body.services.telegramBot.status).toBe("up");
    expect(body.services.supervisor.status).toBe("up");
    expect(body.timestamp).toBeDefined();
  });

  it("returns degraded when some services are down", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": false, supervisor: false });
    simulateFetch(
      new Map([
        ["http://localhost:3001", { ok: true, status: 200 }],
        ["http://localhost:4100", { ok: true, status: 200 }],
        ["http://localhost:5174", { ok: false, status: 502 }],
        ["http://localhost:3050", { ok: true, status: 200 }],
      ]),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.services.dashboard.status).toBe("up");
    expect(body.services.observabilityClient.status).toBe("down");
    expect(body.services.telegramBot.status).toBe("down");
    expect(body.services.supervisor.status).toBe("down");
  });

  it("returns unhealthy when all services are down", async () => {
    simulateExecFile({ dispatcher: false, "telegram-bot": false, supervisor: false });
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    for (const service of Object.values(body.services) as Array<{ status: string }>) {
      expect(service.status).toBe("down");
    }
  });

  it("includes port info for HTTP-checked services", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    simulateFetch(
      new Map([
        ["http://localhost:3001", { ok: true, status: 200 }],
        ["http://localhost:4100", { ok: true, status: 200 }],
        ["http://localhost:5174", { ok: true, status: 200 }],
        ["http://localhost:3050", { ok: true, status: 200 }],
      ]),
    );

    const response = await GET();
    const body = await response.json();

    expect(body.services.dashboard.port).toBe(3001);
    expect(body.services.observabilityServer.port).toBe(4100);
    expect(body.services.observabilityClient.port).toBe(5174);
    expect(body.services.langfuse.port).toBe(3050);
  });

  it("handles services returning non-ok status codes", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    simulateFetch(
      new Map([
        ["http://localhost:3001", { ok: true, status: 200 }],
        ["http://localhost:4100", { ok: false, status: 500 }],
        ["http://localhost:5174", { ok: true, status: 200 }],
        ["http://localhost:3050", { ok: false, status: 502 }],
      ]),
    );

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("degraded");
    expect(body.services.observabilityServer.status).toBe("down");
    expect(body.services.observabilityServer.message).toContain("500");
    expect(body.services.langfuse.status).toBe("down");
    expect(body.services.langfuse.message).toContain("502");
  });
});
