import { NextResponse } from "next/server";
import { exec } from "child_process";

const CHECK_TIMEOUT_MS = 3000;

const OBSERVABILITY_URL =
  process.env.OBSERVABILITY_URL || "http://localhost:4000";
const LANGFUSE_URL = process.env.LANGFUSE_URL || "http://localhost:3100";
const AO_API_URL = process.env.AO_API_URL || "http://localhost:3000";

interface ServiceStatus {
  status: "up" | "down";
  message: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    tmux: ServiceStatus;
    ao: ServiceStatus;
    observability: ServiceStatus;
    langfuse: ServiceStatus;
  };
  timestamp: string;
}

function checkTmux(): Promise<ServiceStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ status: "down", message: "tmux check timed out" });
    }, CHECK_TIMEOUT_MS);

    exec("tmux ls", (error, stdout) => {
      clearTimeout(timeout);
      if (error) {
        resolve({
          status: "down",
          message: `tmux not running: ${error.message}`,
        });
      } else {
        resolve({
          status: "up",
          message: `tmux sessions active: ${stdout.trim().split("\n").length}`,
        });
      }
    });
  });
}

function fetchWithTimeout(url: string, label: string): Promise<ServiceStatus> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      resolve({ status: "down", message: `${label} check timed out` });
    }, CHECK_TIMEOUT_MS);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        if (res.ok) {
          resolve({ status: "up", message: `${label} is reachable` });
        } else {
          resolve({
            status: "down",
            message: `${label} responded with status ${res.status}`,
          });
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) {
          resolve({
            status: "down",
            message: `${label} unreachable: ${err.message}`,
          });
        }
      });
  });
}

export async function GET() {
  const [tmux, ao, observability, langfuse] = await Promise.all([
    checkTmux(),
    fetchWithTimeout(AO_API_URL, "AO process"),
    fetchWithTimeout(OBSERVABILITY_URL, "Observability server"),
    fetchWithTimeout(LANGFUSE_URL, "Langfuse"),
  ]);

  const services = { tmux, ao, observability, langfuse };
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
