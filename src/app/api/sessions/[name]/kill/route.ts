import { NextResponse } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  try {
    await execFileAsync("tmux", ["kill-session", "-t", sessionName]);
    return NextResponse.json({ sessionName, killed: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    const isNotFound =
      message.includes("can't find") ||
      message.includes("no server running") ||
      message.includes("session not found");

    return NextResponse.json(
      {
        sessionName,
        killed: false,
        error: isNotFound
          ? `Session "${sessionName}" not found`
          : `Failed to kill session: ${message}`,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
