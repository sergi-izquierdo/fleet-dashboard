import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CHECK_TIMEOUT_MS = 3000;

const FLEET_SERVICES = [
  "fleet-orchestrator",
  "fleet-telegram",
  "fleet-dashboard",
  "fleet-obs-server",
  "fleet-obs-client",
  "fleet-auto-accept",
] as const;

type ServiceName = (typeof FLEET_SERVICES)[number];

export interface ServiceStatus {
  name: ServiceName;
  status: "active" | "inactive" | "failed" | "unknown";
  statusText: string;
}

export interface ServicesResponse {
  services: ServiceStatus[];
  timestamp: string;
}

function getSystemctlEnv(): NodeJS.ProcessEnv {
  const uid = process.getuid?.() ?? 1000;
  return {
    ...process.env,
    DBUS_SESSION_BUS_ADDRESS:
      process.env.DBUS_SESSION_BUS_ADDRESS ||
      `unix:path=/run/user/${uid}/bus`,
    XDG_RUNTIME_DIR:
      process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`,
  };
}

async function checkService(name: ServiceName): Promise<ServiceStatus> {
  const env = getSystemctlEnv();
  try {
    const { stdout } = await Promise.race([
      execFileAsync("systemctl", ["--user", "is-active", name], { env, timeout: CHECK_TIMEOUT_MS }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS)
      ),
    ]);
    const statusText = stdout.trim();
    const status =
      statusText === "active"
        ? "active"
        : statusText === "inactive"
          ? "inactive"
          : statusText === "failed"
            ? "failed"
            : "unknown";
    return { name, status, statusText };
  } catch (err) {
    // execFile rejects with non-zero exit code when service is not active
    if (err instanceof Error && "stdout" in err) {
      const statusText = (err as NodeJS.ErrnoException & { stdout: string }).stdout?.trim() ?? "unknown";
      const status =
        statusText === "inactive"
          ? "inactive"
          : statusText === "failed"
            ? "failed"
            : "unknown";
      return { name, status, statusText };
    }
    return { name, status: "unknown", statusText: "unknown" };
  }
}

export async function GET() {
  const services = await Promise.all(FLEET_SERVICES.map(checkService));

  const response: ServicesResponse = {
    services,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
