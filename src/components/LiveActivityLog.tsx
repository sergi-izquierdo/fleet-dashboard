"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ActivityLog, { type AgentEvent } from "@/components/ActivityLog";

const POLL_INTERVAL_MS = 10_000;

export default function LiveActivityLog() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevFirstIdRef = useRef<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: AgentEvent[] = await res.json();
      setEvents(data);
      setError(null);

      // Auto-scroll to top when new events arrive
      if (data.length > 0 && data[0].id !== prevFirstIdRef.current) {
        prevFirstIdRef.current = data[0].id;
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-gray-700 bg-gray-900 p-4"
        data-testid="live-activity-loading"
      >
        <h2 className="mb-3 text-lg font-semibold text-gray-100">
          Live Activity Log
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          <span className="ml-3 text-sm text-gray-400">Loading events...</span>
        </div>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div
        className="rounded-xl border border-gray-700 bg-gray-900 p-4"
        data-testid="live-activity-error"
      >
        <h2 className="mb-3 text-lg font-semibold text-gray-100">
          Live Activity Log
        </h2>
        <p className="py-4 text-center text-sm text-red-400">
          Failed to load events: {error}
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} data-testid="live-activity-log">
      <ActivityLog events={events} maxHeight="max-h-[32rem]" />
    </div>
  );
}
