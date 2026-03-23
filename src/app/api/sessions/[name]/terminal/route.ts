import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";

interface TerminalResponse {
  sessionName: string;
  output: string;
  error?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  try {
    const { stdout } = await execFileAsync("tmux", [
      "capture-pane",
      "-t",
      sessionName,
      "-p",
      "-S",
      "-500",
    ]);

    const response: TerminalResponse = {
      sessionName,
      output: stdout,
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
      output: "",
      error: isNotFound
        ? `Session "${sessionName}" not found`
        : `Failed to read terminal: ${message}`,
    };

    return NextResponse.json(response, {
      status: isNotFound ? 404 : 500,
    });
  }
}
