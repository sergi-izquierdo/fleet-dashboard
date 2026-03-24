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
 *
 * Strategy: look at the last non-empty lines of tmux output.
 * - Claude prompt visible (e.g. ">" or "claude>" at end) → idle
 * - Tool output streaming / active commands → working
 * - Error patterns in recent output → stuck
 */
export function determineStatus(paneOutput: string): SessionStatus {
  const lines = paneOutput.trim().split("\n").filter(Boolean);
  // Focus on the last few lines for status detection
  const recentLines = lines.slice(-10);
  const recentText = recentLines.join("\n");
  const lastLine = recentLines[recentLines.length - 1]?.trim() ?? "";

  // Check for stuck patterns in recent output (not entire history)
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
    if (pattern.test(recentText)) {
      return "stuck";
    }
  }

  // Claude Code prompt patterns — if the prompt is visible, the agent is idle
  const idlePromptPatterns = [
    /^>\s*$/,                    // bare ">" prompt
    /^claude>\s*$/i,             // "claude>" prompt
    /^\$\s*$/,                   // bare shell prompt with no command
    /^\S+@\S+[:\$#]\s*$/,       // user@host:$ prompt with nothing after
    /waiting for input/i,
    /What would you like/i,
  ];

  for (const pattern of idlePromptPatterns) {
    if (pattern.test(lastLine)) {
      return "idle";
    }
  }

  // Working patterns — tool output / active command execution
  const workingPatterns = [
    /\$ \S+/,                    // shell command being executed
    /Compiling/i,
    /Building/i,
    /Running/i,
    /Testing/i,
    /Downloading/i,
    /Installing/i,
    /\bRead\b.*file/i,          // Claude tool: Read
    /\bEdit\b.*file/i,          // Claude tool: Edit
    /\bWrite\b.*file/i,         // Claude tool: Write
    /\bBash\b/,                  // Claude tool: Bash
    /\bGrep\b/,                  // Claude tool: Grep
    /\bGlob\b/,                  // Claude tool: Glob
    /\bgit\s+(push|pull|commit|add|checkout|merge|rebase)\b/i,
    /\bnpm\s+(install|run|test|build)\b/i,
    /\bnpx\b/,
    /Task:/i,
    /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,  // spinner characters
  ];

  for (const pattern of workingPatterns) {
    if (pattern.test(recentText)) {
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
