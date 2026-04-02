"use client";

import { useFleetNotifications } from "@/hooks/useFleetNotifications";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Headless component that wires SSE fleet events to the toast system and
 * notification center. Renders nothing — mount it once in DashboardLayout.
 */
export function FleetNotifications() {
  const { addNotification } = useNotifications();

  useFleetNotifications({ onNotification: addNotification });

  return null;
}
