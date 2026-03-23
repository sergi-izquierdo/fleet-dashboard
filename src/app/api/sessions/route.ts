import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";
import { parseTmuxList, computeUptime, determineStatus, extractBranch } from "@/lib/sessionHelpers";
import type {
  TmuxSession,
  SessionsResponse,
} from "@/types/sessions";

async function capturePane(sessionName: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "tmux", ["capture-pane", "-t", sessionName, "-p", "-l", "50"]
    );
    return stdout;
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const { stdout: tmuxListOutput } = await execFileAsync("tmux", ["ls"]);
    const rawSessions = parseTmuxList(tmuxListOutput);

    const sessions: TmuxSession[] = await Promise.all(
      rawSessions.map(async ({ name, created }) => {
        const paneOutput = await capturePane(name);
        return {
          name,
          status: determineStatus(paneOutput),
          uptime: computeUptime(created),
          branch: extractBranch(paneOutput),
        };
      })
    );

    const response: SessionsResponse = { sessions };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    const isNoServer =
      message.includes("no server running") ||
      message.includes("command not found") ||
      message.includes("No such file");

    const response: SessionsResponse = {
      sessions: [],
      error: isNoServer
        ? "tmux is not running"
        : `Failed to read tmux sessions: ${message}`,
    };

    return NextResponse.json(response, { status: 200 });
  }
}
