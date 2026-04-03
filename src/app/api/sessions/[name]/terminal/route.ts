import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";
import { isValidSessionName } from "@/lib/sessionValidation";

interface TerminalResponse {
  sessionName: string;
  lines: string[];
  active: boolean;
  error?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  if (!isValidSessionName(sessionName)) {
    return NextResponse.json(
      {
        sessionName,
        lines: [],
        active: false,
        error: "Invalid session name",
      } satisfies TerminalResponse,
      { status: 400 }
    );
  }

  try {
    const { stdout } = await execFileAsync("tmux", [
      "capture-pane",
      "-t",
      sessionName,
      "-p",
      "-S",
      "-200",
    ]);

    const lines = stdout
      .split("\n")
      .filter((line, idx, arr) => {
        const isTrailing = arr.slice(idx).every((l) => l.trim() === "");
        return !isTrailing;
      });

    const response: TerminalResponse = {
      sessionName,
      lines,
      active: true,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    const isNotFound =
      message.includes("can't find") ||
      message.includes("no server running") ||
      message.includes("session not found");

    const response: TerminalResponse = {
      sessionName,
      lines: [],
      active: false,
      error: isNotFound
        ? `Session "${sessionName}" not found`
        : `Failed to read terminal: ${message}`,
    };

    return NextResponse.json(response, {
      status: isNotFound ? 404 : 500,
    });
  }
}
