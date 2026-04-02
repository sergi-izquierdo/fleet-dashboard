"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import type { Notification, NotificationEventType } from "@/types/notifications";
import { eventTypeToSeverity } from "@/types/notifications";

const STORAGE_KEY = "fleet-dashboard-notifications";
const MAX_NOTIFICATIONS = 50;

export interface AddNotificationParams {
  title: string;
  description: string;
  eventType: NotificationEventType;
  agentName?: string;
}

let globalAddListeners: Array<(params: AddNotificationParams) => void> = [];

export function addNotificationGlobally(params: AddNotificationParams) {
  globalAddListeners.forEach((l) => l(params));
}

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // localStorage full or unavailable
  }
}

const subscribe = () => () => {};

export function useNotifications() {
  const isLoaded = useSyncExternalStore(subscribe, () => true, () => false);

  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  const updateNotifications = useCallback((updater: (prev: Notification[]) => Notification[]) => {
    setNotifications((prev) => {
      const next = updater(prev);
      saveNotifications(next);
      return next;
    });
  }, []);

  const addNotification = useCallback(
    (params: {
      title: string;
      description: string;
      eventType: NotificationEventType;
      agentName?: string;
    }) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: params.title,
        description: params.description,
        eventType: params.eventType,
        severity: eventTypeToSeverity[params.eventType],
        timestamp: new Date().toISOString(),
        read: false,
        agentName: params.agentName,
      };

      updateNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
    },
    [updateNotifications],
  );

  const markAsRead = useCallback((id: string) => {
    updateNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, [updateNotifications]);

  const markAllAsRead = useCallback(() => {
    updateNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [updateNotifications]);

  const dismiss = useCallback((id: string) => {
    updateNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [updateNotifications]);

  const clearAll = useCallback(() => {
    updateNotifications(() => []);
  }, [updateNotifications]);

  useEffect(() => {
    globalAddListeners.push(addNotification);
    return () => {
      globalAddListeners = globalAddListeners.filter((l) => l !== addNotification);
    };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoaded,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  };
}
