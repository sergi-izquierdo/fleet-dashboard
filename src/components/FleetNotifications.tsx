"use client";

import { useFleetNotifications } from "@/hooks/useFleetNotifications";

/**
 * Mounts the fleet SSE notification system.
 * Subscribes to the /api/events/stream endpoint and dispatches toast
 * notifications and bell-icon notifications for actionable fleet events.
 *
 * Renders nothing — side effects only.
 */
export function FleetNotifications() {
  useFleetNotifications();
  return null;
}
