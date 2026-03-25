import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";

const TMUX_BIN = "/usr/bin/tmux";

interface KillResponse {
  success: boolean;
  sessionName: string;
  error?: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  try {
    await execFileAsync(TMUX_BIN, ["kill-session", "-t", sessionName]);

    const response: KillResponse = { success: true, sessionName };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const isNotFound =
      message.includes("can't find") ||
      message.includes("no server running") ||
      message.includes("session not found") ||
      message.includes("No such session");

    const response: KillResponse = {
      success: false,
      sessionName,
      error: isNotFound
        ? `Session "${sessionName}" not found`
        : `Failed to kill session: ${message}`,
    };

    return NextResponse.json(response, {
      status: isNotFound ? 404 : 500,
    });
  }
}
