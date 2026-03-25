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

// Import after mocking
import { GET } from "@/app/api/services/route";

type ExecCallback = (err: NodeJS.ErrnoException | null, result: { stdout: string }) => void;

// execFile can be called as (cmd, args, callback) or (cmd, args, options, callback)
function getCallback(...args: unknown[]): ExecCallback {
  return args[args.length - 1] as ExecCallback;
}

function simulateActive() {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    getCallback(...args)(null, { stdout: "active\n" });
  });
}

function simulateInactive() {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error("not active"), { stdout: "inactive\n" }) as NodeJS.ErrnoException & { stdout: string };
    getCallback(...args)(err, { stdout: "inactive\n" });
  });
}

function simulateError() {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    getCallback(...args)(new Error("command not found"), { stdout: "" });
  });
}

describe("/api/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a services array with all 6 fleet services", async () => {
    simulateActive();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.services).toHaveLength(6);
    expect(body.timestamp).toBeDefined();

    const names = body.services.map((s: { name: string }) => s.name);
    expect(names).toContain("fleet-orchestrator");
    expect(names).toContain("fleet-telegram");
    expect(names).toContain("fleet-dashboard");
    expect(names).toContain("fleet-obs-server");
    expect(names).toContain("fleet-obs-client");
    expect(names).toContain("fleet-auto-accept");
  });

  it("reports active status when systemctl returns active", async () => {
    simulateActive();

    const response = await GET();
    const body = await response.json();

    for (const service of body.services) {
      expect(service.status).toBe("active");
    }
  });

  it("reports inactive status when systemctl returns inactive", async () => {
    simulateInactive();

    const response = await GET();
    const body = await response.json();

    for (const service of body.services) {
      expect(service.status).toBe("inactive");
    }
  });

  it("reports unknown status when systemctl call errors without stdout", async () => {
    simulateError();

    const response = await GET();
    const body = await response.json();

    for (const service of body.services) {
      expect(service.status).toBe("unknown");
    }
  });
});
