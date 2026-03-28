import { NextResponse } from "next/server";
import { accessSync, constants } from "fs";
import { execFileAsync } from "@/lib/execFileAsync";
import { parseTmuxList, computeUptime, determineStatus, extractBranch, extractTaskName } from "@/lib/sessionHelpers";
import type {
  TmuxSession,
  SessionsResponse,
} from "@/types/sessions";

const TMUX_BIN = "/usr/bin/tmux";

function tmuxExists(): boolean {
  try {
    accessSync(TMUX_BIN, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const GIT_BIN = "/usr/bin/git";
const PROJECTS_DIR = process.env.PROJECTS_DIR || "/home/sergi/projects";

async function capturePane(sessionName: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      TMUX_BIN, ["capture-pane", "-t", sessionName, "-p", "-l", "50"]
    );
    return stdout;
  } catch {
    return "";
  }
}

async function getGitBranch(sessionName: string): Promise<string | null> {
  // Session names are like agent-fle-42, agent-syn-10. Extract project prefix and issue number.
  // Worktrees live at {project}/.worktrees/issue-{N}
  const match = sessionName.match(/^agent-([a-z]+)-(\d+)$/);
  if (!match) return null;

  const prefixToProject: Record<string, string> = {
    fle: "fleet-dashboard",
    syn: "synapse-notes",
    aut: "autotask-engine",
    pav: "pavello-larapita-app",
  };

  const project = prefixToProject[match[1]];
  if (!project) return null;

  const worktreePath = `${PROJECTS_DIR}/${project}/.worktrees/issue-${match[2]}`;
  try {
    const { stdout } = await execFileAsync(
      GIT_BIN, ["-C", worktreePath, "branch", "--show-current"]
    );
    const branch = stdout.trim();
    return branch || null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!tmuxExists()) {
    const response: SessionsResponse = { sessions: [] };
    return NextResponse.json(response, { status: 200 });
  }

  try {
    const { stdout: tmuxListOutput } = await execFileAsync(TMUX_BIN, ["ls"]);
    const rawSessions = parseTmuxList(tmuxListOutput);

    const sessions: TmuxSession[] = await Promise.all(
      rawSessions.map(async ({ name, created }) => {
        const [paneOutput, gitBranch] = await Promise.all([
          capturePane(name),
          getGitBranch(name),
        ]);
        return {
          name,
          status: determineStatus(paneOutput),
          uptime: computeUptime(created),
          branch: gitBranch ?? extractBranch(paneOutput),
          taskName: extractTaskName(paneOutput),
        };
      })
    );

    const response: SessionsResponse = { sessions };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    const isNoSessions =
      message.includes("no server running") ||
      message.includes("no sessions");

    if (isNoSessions) {
      const response: SessionsResponse = { sessions: [] };
      return NextResponse.json(response, { status: 200 });
    }

    const isMissing =
      message.includes("command not found") ||
      message.includes("No such file");

    const response: SessionsResponse = {
      sessions: [],
      error: isMissing
        ? "tmux is not running"
        : `Failed to read tmux sessions: ${message}`,
    };

    return NextResponse.json(response, { status: 200 });
  }
}
