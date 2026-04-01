"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";

export type FleetEventType =
  | "connected"
  | "cycle"
  | "agent-started"
  | "agent-completed"
  | "pr-created"
  | "pr-merged";

export interface FleetEvent {
  type: FleetEventType;
  data: unknown;
  id: string;
}

export type FleetEventHandler = (event: FleetEvent) => void;

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

const ALL_EVENT_TYPES: FleetEventType[] = [
  "connected",
  "cycle",
  "agent-started",
  "agent-completed",
  "pr-created",
  "pr-merged",
];

export interface UseFleetEventsOptions {
  /** Only receive these event types. Omit to receive all. */
  eventTypes?: FleetEventType[];
  /** Called when the SSE connection is established or re-established. */
  onConnect?: () => void;
  /** Called when the SSE connection errors and a reconnect is scheduled. */
  onDisconnect?: () => void;
  /** SSE endpoint URL. Defaults to /api/events/stream */
  url?: string;
}

export function useFleetEvents(
  onEvent: FleetEventHandler,
  options: UseFleetEventsOptions = {},
): void {
  const { eventTypes, onConnect, onDisconnect, url = "/api/events/stream" } =
    options;

  // Stable refs so callbacks don't force re-connects.
  // Updated via useLayoutEffect to satisfy react-hooks/refs (no render-time writes).
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const eventTypesRef = useRef(eventTypes);

  useLayoutEffect(() => {
    onEventRef.current = onEvent;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    eventTypesRef.current = eventTypes;
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // connectRef avoids a self-reference inside useCallback (react-hooks/immutability)
  const connectRef = useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    const typesToSubscribe = eventTypesRef.current ?? ALL_EVENT_TYPES;

    function makeListener(type: FleetEventType) {
      return (e: MessageEvent) => {
        if (!mountedRef.current) return;
        const filter = eventTypesRef.current;
        if (filter && !filter.includes(type)) return;

        let data: unknown;
        try {
          data = JSON.parse(e.data as string);
        } catch {
          data = e.data;
        }

        onEventRef.current({ type, data, id: e.lastEventId });
      };
    }

    for (const type of typesToSubscribe) {
      es.addEventListener(type, makeListener(type));
    }

    es.onopen = () => {
      if (!mountedRef.current) return;
      backoffRef.current = INITIAL_BACKOFF_MS;
      onConnectRef.current?.();
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      if (!mountedRef.current) return;
      onDisconnectRef.current?.();

      const delay = backoffRef.current;
      backoffRef.current = Math.min(
        backoffRef.current * BACKOFF_MULTIPLIER,
        MAX_BACKOFF_MS,
      );

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current();
      }, delay);
    };
  }, [url]);

  useLayoutEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);
}
