import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock child_process.execFile
const mockExecFile = vi.fn();
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    default: { ...actual, execFile: (...args: unknown[]) => mockExecFile(...args) },
    execFile: (...args: unknown[]) => mockExecFile(...args),
  };
});

import { POST } from "@/app/api/services/restart/route";
import { ALLOWED_SERVICES } from "@/lib/serviceAllowlist";

type ExecCallback = (err: NodeJS.ErrnoException | null, result: { stdout: string }) => void;

function getCallback(...args: unknown[]): ExecCallback {
  return args[args.length - 1] as ExecCallback;
}

function simulateSuccess() {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    getCallback(...args)(null, { stdout: "" });
  });
}

function simulateFailure(message: string) {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    getCallback(...args)(new Error(message), { stdout: "" });
  });
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/services/restart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/services/restart - allowlist validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ALLOWED_SERVICES contains exactly the 6 expected services", () => {
    expect(ALLOWED_SERVICES).toEqual([
      "orchestrator",
      "dashboard",
      "telegram",
      "obs-server",
      "obs-client",
      "auto-accept",
    ]);
  });

  it("returns 400 for unknown service name", async () => {
    const response = await POST(makeRequest({ service: "unknown-service" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Unknown service");
    expect(body.message).toContain("unknown-service");
  });

  it("returns 400 for empty service name", async () => {
    const response = await POST(makeRequest({ service: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 when service field is missing", async () => {
    const response = await POST(makeRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toContain("service");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/services/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 for shell injection attempt in service name", async () => {
    const response = await POST(makeRequest({ service: "orchestrator; rm -rf /" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe("/api/services/restart - integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with success=true for a valid service when systemctl succeeds", async () => {
    simulateSuccess();

    const response = await POST(makeRequest({ service: "orchestrator" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("fleet-orchestrator");
  });

  it("calls systemctl with --user restart fleet-{service}", async () => {
    simulateSuccess();

    await POST(makeRequest({ service: "dashboard" }));

    expect(mockExecFile).toHaveBeenCalledWith(
      "systemctl",
      ["--user", "restart", "fleet-dashboard"],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("returns 200 for all allowed services", async () => {
    for (const service of ALLOWED_SERVICES) {
      simulateSuccess();
      const response = await POST(makeRequest({ service }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  it("returns 500 when systemctl fails", async () => {
    simulateFailure("Failed to restart service");

    const response = await POST(makeRequest({ service: "orchestrator" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toContain("fleet-orchestrator");
  });
});
