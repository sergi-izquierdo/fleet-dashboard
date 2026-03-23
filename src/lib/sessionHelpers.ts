import type { SessionStatus } from "@/types/sessions";

/**
 * Parse `tmux ls` output into session names and creation times.
 * Example line: "agent-1: 3 windows (created Mon Mar 23 10:00:00 2026)"
 */
export function parseTmuxList(
  output: string
): { name: string; created: string }[] {
  const sessions: { name: string; created: string }[] = [];
  const lines = output.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s.*\(created\s+(.+)\)$/);
    if (match) {
      sessions.push({ name: match[1], created: match[2] });
    }
  }

  return sessions;
}

/**
 * Compute uptime string from a tmux "created" date string.
 */
export function computeUptime(createdStr: string): string {
  const created = new Date(createdStr);
  if (isNaN(created.getTime())) {
    return "unknown";
  }

  const diffMs = Date.now() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s`;

  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remainMin}m`;

  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

/**
 * Determine session status from captured pane output.
 */
export function determineStatus(paneOutput: string): SessionStatus {
  const lines = paneOutput.trim().split("\n").filter(Boolean);

  const stuckPatterns = [
    /error:/i,
    /ENOENT/,
    /SIGTERM/,
    /SIGKILL/,
    /fatal:/i,
    /panic:/i,
    /Traceback/i,
    /maximum.*retries/i,
    /rate.?limit/i,
  ];

  for (const pattern of stuckPatterns) {
    if (pattern.test(paneOutput)) {
      return "stuck";
    }
  }

  const workingPatterns = [
    /\$\s+\S/,
    /Compiling/i,
    /Building/i,
    /Running/i,
    /Testing/i,
    /Downloading/i,
    /Installing/i,
    /\bcommit\b/i,
    /\bgit\b/i,
    /\bnpm\b/,
    /\bnpx\b/,
    /Task:/i,
    /claude/i,
  ];

  for (const pattern of workingPatterns) {
    if (pattern.test(paneOutput)) {
      return "working";
    }
  }

  if (lines.length <= 2) {
    return "idle";
  }

  return "idle";
}

/**
 * Extract the current git branch from pane output.
 */
export function extractBranch(paneOutput: string): string {
  const lines = paneOutput.trim().split("\n").reverse();
  for (const line of lines) {
    const gitMatch = line.match(/git:\(([a-zA-Z0-9_./-]+)\)/);
    if (gitMatch) return gitMatch[1];

    const branchMatch = line.match(
      /(?:on|branch)\s+([a-zA-Z0-9_./-]+)/
    );
    if (branchMatch) return branchMatch[1];

    const parenMatch = line.match(/\(([a-zA-Z][a-zA-Z0-9_./-]*)\)/);
    if (parenMatch && parenMatch[1] !== "created") return parenMatch[1];

    const bracketMatch = line.match(/\[([a-zA-Z][a-zA-Z0-9_./-]*)\]/);
    if (bracketMatch) return bracketMatch[1];
  }

  return "unknown";
}
