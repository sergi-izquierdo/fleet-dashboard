import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";
import { isValidSessionName } from "@/lib/sessionValidation";

interface LogsResponse {
  sessionName: string;
  lines: string[];
  error?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  if (!isValidSessionName(sessionName)) {
    return NextResponse.json(
      { error: "Invalid session name" } satisfies Partial<LogsResponse>,
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
      "-50",
    ]);

    const lines = stdout
      .split("\n")
      .filter((line, idx, arr) => {
        // Keep all non-trailing lines; drop trailing empty lines
        const isTrailing = arr.slice(idx).every((l) => l.trim() === "");
        return !isTrailing;
      });

    const response: LogsResponse = { sessionName, lines };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const isNotFound =
      message.includes("can't find") ||
      message.includes("no server running") ||
      message.includes("session not found");

    return NextResponse.json(
      {
        sessionName,
        lines: [],
        error: isNotFound
          ? `Session "${sessionName}" not found`
          : `Failed to read logs: ${message}`,
      } satisfies LogsResponse,
      { status: isNotFound ? 404 : 500 }
    );
  }
}
