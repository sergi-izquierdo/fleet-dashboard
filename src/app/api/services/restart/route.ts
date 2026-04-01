import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { ALLOWED_SERVICES, isAllowedService } from "@/lib/serviceAllowlist";

const execFileAsync = promisify(execFile);

const RESTART_TIMEOUT_MS = 10000;

function getSystemctlEnv(): NodeJS.ProcessEnv {
  const uid = process.getuid?.() ?? 1000;
  return {
    ...process.env,
    DBUS_SESSION_BUS_ADDRESS:
      process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=/run/user/${uid}/bus`,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("service" in body) ||
    typeof (body as Record<string, unknown>).service !== "string"
  ) {
    return NextResponse.json(
      { success: false, message: "Missing required field: service" },
      { status: 400 },
    );
  }

  const service = (body as Record<string, unknown>).service as string;

  if (!isAllowedService(service)) {
    return NextResponse.json(
      {
        success: false,
        message: `Unknown service: "${service}". Allowed services: ${ALLOWED_SERVICES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const unitName = `fleet-${service}`;

  try {
    await execFileAsync(
      "systemctl",
      ["--user", "restart", unitName],
      { env: getSystemctlEnv(), timeout: RESTART_TIMEOUT_MS },
    );
    return NextResponse.json({ success: true, message: `Service ${unitName} restarted successfully` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: `Failed to restart ${unitName}: ${message}` },
      { status: 500 },
    );
  }
}
