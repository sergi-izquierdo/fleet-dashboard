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

describe("/api/health edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes a valid ISO timestamp in the response", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    const timestamp = new Date(body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it("reports tmux session status for dispatcher", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services.dispatcher.status).toBe("up");
    expect(body.services.dispatcher.message).toContain("running");
  });

  it("reports down status when tmux session not found", async () => {
    simulateExecFile({ dispatcher: false, "telegram-bot": false, supervisor: false });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services.dispatcher.status).toBe("down");
    expect(body.services.dispatcher.message).toContain("not found");
    expect(body.services.telegramBot.status).toBe("down");
    expect(body.services.supervisor.status).toBe("down");
  });

  it("handles fetch rejection with error message for services", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();
    const body = await response.json();

    expect(body.services.dashboard.status).toBe("down");
    expect(body.services.dashboard.message).toContain("unreachable");
  });

  it("returns correct HTTP status for degraded state", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
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
    simulateExecFile({ dispatcher: false, "telegram-bot": false, supervisor: false });
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it("reports all seven services in the response", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const response = await GET();
    const body = await response.json();

    expect(body.services).toHaveProperty("dashboard");
    expect(body.services).toHaveProperty("observabilityServer");
    expect(body.services).toHaveProperty("observabilityClient");
    expect(body.services).toHaveProperty("langfuse");
    expect(body.services).toHaveProperty("dispatcher");
    expect(body.services).toHaveProperty("telegramBot");
    expect(body.services).toHaveProperty("supervisor");
  });

  it("each service has status and message fields", async () => {
    simulateExecFile({ dispatcher: true, "telegram-bot": true, supervisor: true });
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
