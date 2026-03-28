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
  uptime: string | null;
  restartCount: number | null;
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

async function getServiceDetails(
  name: ServiceName,
  env: NodeJS.ProcessEnv,
): Promise<{ uptime: string | null; restartCount: number | null }> {
  try {
    const { stdout } = await execFileAsync(
      "systemctl",
      ["--user", "show", name, "--property=ActiveEnterTimestamp,NRestarts"],
      { env, timeout: CHECK_TIMEOUT_MS },
    );
    let uptime: string | null = null;
    let restartCount: number | null = null;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("ActiveEnterTimestamp=")) {
        const val = line.slice("ActiveEnterTimestamp=".length).trim();
        if (val && val !== "n/a" && val !== "") {
          const since = new Date(val).getTime();
          if (!isNaN(since)) {
            const diffMs = Date.now() - since;
            const diffSec = Math.floor(diffMs / 1000);
            const h = Math.floor(diffSec / 3600);
            const m = Math.floor((diffSec % 3600) / 60);
            const s = diffSec % 60;
            uptime = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
          }
        }
      } else if (line.startsWith("NRestarts=")) {
        const val = parseInt(line.slice("NRestarts=".length).trim(), 10);
        if (!isNaN(val)) restartCount = val;
      }
    }
    return { uptime, restartCount };
  } catch {
    return { uptime: null, restartCount: null };
  }
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
    const details = await getServiceDetails(name, env);
    return { name, status, statusText, ...details };
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
      const details = await getServiceDetails(name, env);
      return { name, status, statusText, ...details };
    }
    return { name, status: "unknown", statusText: "unknown", uptime: null, restartCount: null };
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
