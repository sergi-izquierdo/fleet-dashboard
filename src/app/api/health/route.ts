import { NextResponse } from "next/server";
import { execFile } from "child_process";

const CHECK_TIMEOUT_MS = 3000;

const DASHBOARD_URL =
  process.env.DASHBOARD_URL || "http://localhost:3001";
const OBSERVABILITY_SERVER_URL =
  process.env.OBSERVABILITY_SERVER_URL || "http://localhost:4100";
const OBSERVABILITY_CLIENT_URL =
  process.env.OBSERVABILITY_CLIENT_URL || "http://localhost:5174";
const LANGFUSE_URL = process.env.LANGFUSE_URL || "http://localhost:3050";

export interface ServiceStatus {
  status: "up" | "down";
  message: string;
  port?: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, ServiceStatus>;
  timestamp: string;
}

function checkTmuxSession(sessionName: string, label: string): Promise<ServiceStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ status: "down", message: `${label} check timed out` });
    }, CHECK_TIMEOUT_MS);

    execFile("tmux", ["has-session", "-t", sessionName], (error) => {
      clearTimeout(timeout);
      if (error) {
        resolve({
          status: "down",
          message: `${label} session not found`,
        });
      } else {
        resolve({
          status: "up",
          message: `${label} is running`,
        });
      }
    });
  });
}

function checkSupervisor(): Promise<ServiceStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ status: "down", message: "Supervisor check timed out" });
    }, CHECK_TIMEOUT_MS);

    execFile("tmux", ["has-session", "-t", "supervisor"], (error) => {
      clearTimeout(timeout);
      if (error) {
        resolve({
          status: "down",
          message: "Supervisor session not found",
        });
      } else {
        resolve({
          status: "up",
          message: "Supervisor is running",
        });
      }
    });
  });
}

function fetchWithTimeout(
  url: string,
  label: string,
  port?: number,
): Promise<ServiceStatus> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      resolve({ status: "down", message: `${label} check timed out`, port });
    }, CHECK_TIMEOUT_MS);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        if (res.ok) {
          resolve({ status: "up", message: `${label} is reachable`, port });
        } else {
          resolve({
            status: "down",
            message: `${label} responded with status ${res.status}`,
            port,
          });
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) {
          resolve({
            status: "down",
            message: `${label} unreachable: ${err.message}`,
            port,
          });
        }
      });
  });
}

export async function GET() {
  const [
    dashboard,
    observabilityServer,
    observabilityClient,
    langfuse,
    dispatcher,
    telegramBot,
    supervisor,
  ] = await Promise.all([
    fetchWithTimeout(DASHBOARD_URL, "Fleet Dashboard", 3001),
    fetchWithTimeout(OBSERVABILITY_SERVER_URL, "Observability Server", 4100),
    fetchWithTimeout(OBSERVABILITY_CLIENT_URL, "Observability Client", 5174),
    fetchWithTimeout(LANGFUSE_URL, "Langfuse", 3050),
    checkTmuxSession("dispatcher", "Dispatcher"),
    checkTmuxSession("telegram-bot", "Telegram Bot"),
    checkSupervisor(),
  ]);

  const services: Record<string, ServiceStatus> = {
    dashboard,
    observabilityServer,
    observabilityClient,
    langfuse,
    dispatcher,
    telegramBot,
    supervisor,
  };

  const statuses = Object.values(services);
  const upCount = statuses.filter((s) => s.status === "up").length;

  let status: HealthResponse["status"];
  if (upCount === statuses.length) {
    status = "healthy";
  } else if (upCount === 0) {
    status = "unhealthy";
  } else {
    status = "degraded";
  }

  const response: HealthResponse = {
    status,
    services,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: status === "unhealthy" ? 503 : 200,
  });
}
