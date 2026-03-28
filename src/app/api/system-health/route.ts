import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SystemMetric {
  label: string;
  usedLabel: string;
  percent: number;
}

export interface SystemHealthResponse {
  disk: SystemMetric | null;
  memory: SystemMetric | null;
  cpu: SystemMetric | null;
  timestamp: string;
}

async function getDiskUsage(): Promise<SystemMetric | null> {
  try {
    const { stdout } = await execFileAsync("df", ["-BG", "--output=used,size,pcent", "/"], {
      timeout: 3000,
    });
    const lines = stdout.trim().split("\n");
    const parts = lines[1]?.trim().split(/\s+/);
    if (!parts || parts.length < 3) return null;

    const used = parseInt(parts[0].replace("G", ""), 10);
    const total = parseInt(parts[1].replace("G", ""), 10);
    const percent = parseInt(parts[2].replace("%", ""), 10);

    if (isNaN(used) || isNaN(total) || isNaN(percent)) return null;

    return {
      label: "Disk",
      usedLabel: `${used} GB / ${total} GB`,
      percent,
    };
  } catch {
    return null;
  }
}

async function getMemoryUsage(): Promise<SystemMetric | null> {
  try {
    const { stdout } = await execFileAsync("free", ["-m"], { timeout: 3000 });
    const lines = stdout.trim().split("\n");
    const memLine = lines.find((l) => l.startsWith("Mem:"));
    if (!memLine) return null;

    const parts = memLine.trim().split(/\s+/);
    const total = parseInt(parts[1], 10);
    const used = parseInt(parts[2], 10);

    if (isNaN(total) || isNaN(used) || total === 0) return null;

    const percent = Math.round((used / total) * 100);
    const totalGB = (total / 1024).toFixed(1);
    const usedGB = (used / 1024).toFixed(1);

    return {
      label: "Memory",
      usedLabel: `${usedGB} GB / ${totalGB} GB`,
      percent,
    };
  } catch {
    return null;
  }
}

async function getCpuLoad(): Promise<SystemMetric | null> {
  try {
    const { stdout } = await execFileAsync("top", ["-bn1"], { timeout: 5000 });
    const cpuLine = stdout.split("\n").find((l) => l.startsWith("%Cpu") || l.includes("Cpu(s)"));
    if (!cpuLine) return null;

    // Parse idle percentage from top output: "%Cpu(s):  3.1 us,  0.5 sy, ... 95.8 id"
    const idleMatch = cpuLine.match(/(\d+\.?\d*)\s*id/);
    if (!idleMatch) return null;

    const idle = parseFloat(idleMatch[1]);
    const percent = Math.round(100 - idle);

    return {
      label: "CPU",
      usedLabel: `${percent}% load`,
      percent,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [disk, memory, cpu] = await Promise.all([
    getDiskUsage(),
    getMemoryUsage(),
    getCpuLoad(),
  ]);

  const response: SystemHealthResponse = {
    disk,
    memory,
    cpu,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
