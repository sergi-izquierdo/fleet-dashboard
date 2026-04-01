import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { formatSSEMessage } from "@/lib/sseFormat";

export const dynamic = "force-dynamic";

const STATE_PATH =
  process.env.FLEET_STATE_PATH ||
  "/home/sergi/agent-fleet/orchestrator/state.json";

const DISPATCHER_STATUS_PATH =
  process.env.DISPATCHER_STATUS_PATH ||
  "/home/sergi/agent-fleet/orchestrator/dispatcher-status.json";

const POLL_INTERVAL_MS = 5_000;

interface StateJson {
  active: Record<string, unknown>;
  completed: Record<string, CompletedAgent>;
}

interface CompletedAgent {
  pr?: string;
  status?: string;
  completedAt?: string;
}

interface DispatcherCycleSnapshot {
  finishedAt?: string;
  cycleCount?: number;
}

interface DispatcherStatusJson {
  cycle?: DispatcherCycleSnapshot;
}

interface WatchSnapshot {
  activeKeys: Set<string>;
  completedKeys: Set<string>;
  completedWithPr: Set<string>;
  completedMerged: Set<string>;
  dispatcherFinishedAt: string;
  dispatcherCycleCount: number;
}

async function readStateJson(): Promise<StateJson> {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateJson;
  } catch {
    return { active: {}, completed: {} };
  }
}

async function readDispatcherStatus(): Promise<DispatcherStatusJson> {
  try {
    const raw = await readFile(DISPATCHER_STATUS_PATH, "utf-8");
    return JSON.parse(raw) as DispatcherStatusJson;
  } catch {
    return {};
  }
}

function buildSnapshot(
  state: StateJson,
  dispatcher: DispatcherStatusJson,
): WatchSnapshot {
  const activeKeys = new Set(Object.keys(state.active));
  const completedKeys = new Set(Object.keys(state.completed));

  const completedWithPr = new Set<string>();
  const completedMerged = new Set<string>();

  for (const [key, agent] of Object.entries(state.completed)) {
    if (agent.pr) completedWithPr.add(key);
    if (agent.status === "pr_merged") completedMerged.add(key);
  }

  return {
    activeKeys,
    completedKeys,
    completedWithPr,
    completedMerged,
    dispatcherFinishedAt: dispatcher.cycle?.finishedAt ?? "",
    dispatcherCycleCount: dispatcher.cycle?.cycleCount ?? 0,
  };
}

export async function GET(request: NextRequest) {
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
      enqueue(
        formatSSEMessage("connected", { timestamp: connId }, connId),
      );

      // Read initial snapshot
      const [state, dispatcher] = await Promise.all([
        readStateJson(),
        readDispatcherStatus(),
      ]);
      let prev = buildSnapshot(state, dispatcher);

      async function poll() {
        if (closed) return;

        try {
          const [nextState, nextDispatcher] = await Promise.all([
            readStateJson(),
            readDispatcherStatus(),
          ]);
          const next = buildSnapshot(nextState, nextDispatcher);
          const now = String(Date.now());

          // cycle event: dispatcher finished a new cycle
          if (
            next.dispatcherFinishedAt !== "" &&
            next.dispatcherFinishedAt !== prev.dispatcherFinishedAt
          ) {
            enqueue(
              formatSSEMessage(
                "cycle",
                {
                  finishedAt: next.dispatcherFinishedAt,
                  cycleCount: next.dispatcherCycleCount,
                },
                now,
              ),
            );
          }

          // agent-started: keys newly added to active
          for (const key of next.activeKeys) {
            if (!prev.activeKeys.has(key)) {
              const agentData = nextState.active[key];
              enqueue(
                formatSSEMessage("agent-started", { key, agent: agentData }, now),
              );
            }
          }

          // agent-completed: keys that were active but now in completed
          for (const key of next.completedKeys) {
            if (prev.activeKeys.has(key) && !prev.completedKeys.has(key)) {
              const agentData = nextState.completed[key];
              enqueue(
                formatSSEMessage(
                  "agent-completed",
                  { key, agent: agentData },
                  now,
                ),
              );
            }
          }

          // pr-created: new completed entries with a PR
          for (const key of next.completedWithPr) {
            if (!prev.completedWithPr.has(key)) {
              const agentData = nextState.completed[key];
              enqueue(
                formatSSEMessage(
                  "pr-created",
                  { key, pr: agentData?.pr, agent: agentData },
                  now,
                ),
              );
            }
          }

          // pr-merged: new merged entries
          for (const key of next.completedMerged) {
            if (!prev.completedMerged.has(key)) {
              const agentData = nextState.completed[key];
              enqueue(
                formatSSEMessage(
                  "pr-merged",
                  { key, pr: agentData?.pr, agent: agentData },
                  now,
                ),
              );
            }
          }

          prev = next;
        } catch {
          // Ignore file read errors and continue polling
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
