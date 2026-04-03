import { NextRequest } from "next/server";
import { execFileAsync } from "@/lib/execFileAsync";
import { isValidSessionName } from "@/lib/sessionValidation";
import { formatSSEMessage } from "@/lib/sseFormat";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_000;

async function capturePane(sessionName: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("tmux", [
      "capture-pane",
      "-t",
      sessionName,
      "-p",
      "-S",
      "-200",
    ]);
    return stdout;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: sessionName } = await params;

  if (!isValidSessionName(sessionName)) {
    return new Response(
      JSON.stringify({ error: "Invalid session name" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const signal = request.signal;

  let closed = signal.aborted;
  signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      function enqueue(msg: string) {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(msg));
          } catch {
            closed = true;
          }
        }
      }

      // Send initial connection event
      const connId = String(Date.now());
      enqueue(formatSSEMessage("connected", { sessionName }, connId));

      // Get initial content
      const initial = await capturePane(sessionName);
      if (initial === null) {
        enqueue(
          formatSSEMessage(
            "session-ended",
            { sessionName },
            String(Date.now())
          )
        );
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
        return;
      }

      let prevContent = initial;

      // Send initial lines
      const initialLines = initial
        .split("\n")
        .filter((line, idx, arr) => {
          const isTrailing = arr.slice(idx).every((l) => l.trim() === "");
          return !isTrailing;
        });
      enqueue(
        formatSSEMessage("lines", { lines: initialLines }, String(Date.now()))
      );

      async function poll() {
        if (closed) return;

        const content = await capturePane(sessionName);

        if (content === null) {
          // Session ended
          enqueue(
            formatSSEMessage(
              "session-ended",
              { sessionName },
              String(Date.now())
            )
          );
          if (!closed) {
            try {
              controller.close();
            } catch {
              // already closed
            }
          }
          return;
        }

        if (content !== prevContent) {
          const lines = content
            .split("\n")
            .filter((line, idx, arr) => {
              const isTrailing = arr.slice(idx).every((l) => l.trim() === "");
              return !isTrailing;
            });
          enqueue(
            formatSSEMessage("lines", { lines }, String(Date.now()))
          );
          prevContent = content;
        }

        if (!closed) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
