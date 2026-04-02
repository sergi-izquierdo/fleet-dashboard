"use client";

import { useState, useCallback } from "react";
import { useFleetEvents, type FleetEvent } from "@/hooks/useFleetEvents";
import { showToast } from "@/components/Toast";
import type { NotificationEventType } from "@/types/notifications";

export type FleetNotificationEventType =
  | "agent-started"
  | "agent-completed"
  | "pr-created"
  | "pr-merged";

const ALL_FLEET_NOTIFICATION_TYPES: FleetNotificationEventType[] = [
  "agent-started",
  "agent-completed",
  "pr-created",
  "pr-merged",
];

const PREFS_STORAGE_KEY = "fleet-notification-prefs";

function loadEnabledTypes(): FleetNotificationEventType[] {
  if (typeof window === "undefined") return ALL_FLEET_NOTIFICATION_TYPES;
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!stored) return ALL_FLEET_NOTIFICATION_TYPES;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return ALL_FLEET_NOTIFICATION_TYPES;
    return parsed.filter((t): t is FleetNotificationEventType =>
      ALL_FLEET_NOTIFICATION_TYPES.includes(t as FleetNotificationEventType),
    );
  } catch {
    return ALL_FLEET_NOTIFICATION_TYPES;
  }
}

function saveEnabledTypes(types: FleetNotificationEventType[]): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(types));
  } catch {
    // localStorage unavailable — preferences not persisted
  }
}

interface AgentEventData {
  key: string;
  agent: { pr?: string; status?: string; completedAt?: string } | null | undefined;
}

interface PrEventData {
  key: string;
  pr?: string;
  agent?: { pr?: string; status?: string } | null;
}

function isAgentEventData(data: unknown): data is AgentEventData {
  return typeof data === "object" && data !== null && "key" in data && typeof (data as Record<string, unknown>).key === "string";
}

function isPrEventData(data: unknown): data is PrEventData {
  return typeof data === "object" && data !== null && "key" in data && typeof (data as Record<string, unknown>).key === "string";
}

export interface NotificationParams {
  title: string;
  description: string;
  eventType: NotificationEventType;
  agentName?: string;
}

export interface UseFleetNotificationsOptions {
  /** Called for each event that should be added to the notification center. */
  onNotification?: (params: NotificationParams) => void;
}

export interface UseFleetNotificationsResult {
  /** Event types currently enabled for notifications. */
  enabledTypes: FleetNotificationEventType[];
  /** Toggle a specific event type on or off. */
  toggleType: (type: FleetNotificationEventType) => void;
}

export function useFleetNotifications(
  options: UseFleetNotificationsOptions = {},
): UseFleetNotificationsResult {
  const { onNotification } = options;

  const [enabledTypes, setEnabledTypes] = useState<FleetNotificationEventType[]>(loadEnabledTypes);

  const toggleType = useCallback((type: FleetNotificationEventType) => {
    setEnabledTypes((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      saveEnabledTypes(next);
      return next;
    });
  }, []);

  const handleEvent = useCallback(
    (event: FleetEvent) => {
      if (!enabledTypes.includes(event.type as FleetNotificationEventType)) return;

      switch (event.type) {
        case "agent-started": {
          if (!isAgentEventData(event.data)) break;
          const { key } = event.data;
          showToast({ type: "info", title: "Agent started", description: key });
          onNotification?.({
            title: "Agent started",
            description: `Agent ${key} is now running`,
            eventType: "agent_started",
            agentName: key,
          });
          break;
        }

        case "agent-completed": {
          if (!isAgentEventData(event.data)) break;
          const { key, agent } = event.data;
          const status = agent?.status ?? "completed";
          showToast({
            type: "success",
            title: "Agent completed",
            description: `${key} — ${status}`,
          });
          onNotification?.({
            title: "Agent completed",
            description: `Agent ${key} finished with status: ${status}`,
            eventType: "agent_completed",
            agentName: key,
          });
          break;
        }

        case "pr-created": {
          if (!isPrEventData(event.data)) break;
          const { key, pr } = event.data;
          const prLabel = pr ? `PR ${pr}` : "a PR";
          showToast({ type: "info", title: "PR created", description: prLabel });
          onNotification?.({
            title: "PR created",
            description: `${key} opened ${prLabel}`,
            eventType: "pr_created",
            agentName: key,
          });
          break;
        }

        case "pr-merged": {
          if (!isPrEventData(event.data)) break;
          const { key, pr } = event.data;
          const prLabel = pr ? `PR ${pr}` : "a PR";
          showToast({ type: "success", title: "PR merged", description: prLabel });
          onNotification?.({
            title: "PR merged",
            description: `${key} merged ${prLabel}`,
            eventType: "pr_merged",
            agentName: key,
          });
          break;
        }

        default:
          break;
      }
    },
    [enabledTypes, onNotification],
  );

  useFleetEvents(handleEvent, {
    eventTypes: ["agent-started", "agent-completed", "pr-created", "pr-merged"],
  });

  return { enabledTypes, toggleType };
}
