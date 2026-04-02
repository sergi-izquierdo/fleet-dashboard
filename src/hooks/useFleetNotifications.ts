"use client";

import { useCallback } from "react";
import { useFleetEvents } from "@/hooks/useFleetEvents";
import type { FleetEvent, FleetEventType } from "@/hooks/useFleetEvents";
import { showToast } from "@/components/Toast";
import { addNotificationGlobally } from "@/hooks/useNotifications";
import type { NotificationEventType } from "@/types/notifications";

export const ACTIONABLE_EVENT_TYPES: FleetEventType[] = [
  "agent-started",
  "agent-completed",
  "pr-created",
  "pr-merged",
];

const PREFS_STORAGE_KEY = "fleet-notification-enabled-types";

export function getEnabledEventTypes(): FleetEventType[] {
  if (typeof window === "undefined") return ACTIONABLE_EVENT_TYPES;
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FleetEventType[];
      const valid = parsed.filter((t) => ACTIONABLE_EVENT_TYPES.includes(t));
      if (valid.length > 0) return valid;
    }
  } catch {
    // localStorage unavailable
  }
  return ACTIONABLE_EVENT_TYPES;
}

export function setEnabledEventTypes(types: FleetEventType[]): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(types));
  } catch {
    // localStorage unavailable
  }
}

interface AgentEventData {
  key?: string;
  pr?: string;
  agent?: {
    pr?: string;
    status?: string;
    completedAt?: string;
  };
}

function isAgentEventData(data: unknown): data is AgentEventData {
  return typeof data === "object" && data !== null;
}

interface ToastConfig {
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

interface NotificationConfig {
  title: string;
  description: string;
  eventType: NotificationEventType;
}

function buildEventConfig(
  event: FleetEvent,
): { toast: ToastConfig; notification: NotificationConfig } | null {
  if (!isAgentEventData(event.data)) return null;

  const data = event.data;
  const key = data.key ?? "unknown";

  switch (event.type) {
    case "agent-started":
      return {
        toast: { type: "info", title: "Agent started", description: key },
        notification: {
          title: "Agent started",
          description: key,
          eventType: "agent_started",
        },
      };
    case "agent-completed":
      return {
        toast: { type: "success", title: "Agent completed", description: key },
        notification: {
          title: "Agent completed",
          description: key,
          eventType: "agent_completed",
        },
      };
    case "pr-created": {
      const pr = data.pr ?? data.agent?.pr ?? key;
      return {
        toast: { type: "info", title: "PR created", description: pr },
        notification: {
          title: "PR created",
          description: pr,
          eventType: "pr_created",
        },
      };
    }
    case "pr-merged": {
      const pr = data.pr ?? data.agent?.pr ?? key;
      return {
        toast: { type: "success", title: "PR merged", description: pr },
        notification: {
          title: "PR merged",
          description: pr,
          eventType: "pr_merged",
        },
      };
    }
    default:
      return null;
  }
}

export function useFleetNotifications(): void {
  const handleEvent = useCallback((event: FleetEvent) => {
    const enabledTypes = getEnabledEventTypes();
    if (!enabledTypes.includes(event.type as FleetEventType)) return;

    const config = buildEventConfig(event);
    if (!config) return;

    showToast(config.toast);

    addNotificationGlobally({
      title: config.notification.title,
      description: config.notification.description,
      eventType: config.notification.eventType,
      agentName: isAgentEventData(event.data) ? event.data.key : undefined,
    });
  }, []);

  useFleetEvents(handleEvent, {
    eventTypes: ACTIONABLE_EVENT_TYPES,
  });
}
