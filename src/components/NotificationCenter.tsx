"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import type { Notification } from "@/types/notifications";
import { severityConfig, eventTypeLabels } from "@/types/notifications";
import { useNotifications } from "@/hooks/useNotifications";
import type { ActivityEvent } from "@/types/dashboard";
import { NotificationHistoryPanel } from "@/components/NotificationHistoryPanel";

type PanelTab = "notifications" | "history";

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const config = severityConfig[notification.severity];

  return (
    <div
      className={`group relative flex gap-3 p-3 transition-colors ${
        notification.read
          ? "opacity-60"
          : "bg-gray-50 dark:bg-white/5"
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex-shrink-0 pt-0.5">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${config.dot}`}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {notification.title}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${config.badge}`}
              >
                {eventTypeLabels[notification.eventType]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {notification.description}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {notification.agentName && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {notification.agentName}
                </span>
              )}
              <time
                className="text-[10px] text-gray-400 dark:text-gray-500"
                dateTime={notification.timestamp}
              >
                {formatTimestamp(notification.timestamp)}
              </time>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Mark as read"
                title="Mark as read"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notification.id);
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface NotificationCenterProps {
  activityLog?: ActivityEvent[];
}

export function NotificationCenter({ activityLog = [] }: NotificationCenterProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const {
    notifications,
    unreadCount,
    isLoaded,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("notifications");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Seed demo notifications on first visit
  useEffect(() => {
    if (isLoaded && notifications.length === 0) {
      const demoEvents: Parameters<typeof addNotification>[0][] = [
        {
          title: "PR #42 merged",
          description: "feat: add dark mode toggle merged into main",
          eventType: "pr_merged",
          agentName: "agent-alpha",
        },
        {
          title: "CI failed on PR #38",
          description: "Test suite failed: 3 tests failing in auth module",
          eventType: "ci_failed",
          agentName: "agent-beta",
        },
        {
          title: "Agent gamma unresponsive",
          description: "No heartbeat received for 5 minutes",
          eventType: "agent_stuck",
          agentName: "agent-gamma",
        },
        {
          title: "Deployed to staging",
          description: "v2.1.0 deployed successfully to staging environment",
          eventType: "deploy",
          agentName: "agent-alpha",
        },
        {
          title: "Review requested",
          description: "PR #45 needs your review: fix: resolve login timeout",
          eventType: "review_requested",
          agentName: "agent-delta",
        },
      ];
      // Add in reverse order so first item appears at top
      for (let i = demoEvents.length - 1; i >= 0; i--) {
        setTimeout(() => addNotification(demoEvents[i]), (demoEvents.length - i) * 10);
      }
    }
  }, [isLoaded, notifications.length, addNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="relative">
        <button
          className="relative rounded-md border border-gray-300 dark:border-white/20 p-1.5 text-gray-600 dark:text-white/70 transition-colors"
          aria-label="Notifications"
          data-testid="notification-bell"
          disabled
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-md border border-gray-300 dark:border-white/20 p-1.5 text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
        aria-label={isLoaded && unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="notification-bell"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z"
            clipRule="evenodd"
          />
        </svg>

        {/* Unread Badge — only render after mount to avoid hydration mismatch */}
        {isLoaded && unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-lg shadow-black/10 dark:shadow-black/30"
          role="menu"
          data-testid="notification-dropdown"
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-white/10 px-4 pt-3">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {activeTab === "notifications" ? "Notifications" : "History"}
              </h3>
              <div className="flex items-center gap-2">
                {activeTab === "notifications" && unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                    data-testid="mark-all-read"
                  >
                    Mark all read
                  </button>
                )}
                {activeTab === "notifications" && notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    data-testid="clear-all"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 -mb-px" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "notifications"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                data-testid="tab-notifications"
              >
                Alerts
                {isLoaded && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                data-testid="tab-history"
              >
                History
              </button>
            </div>
          </div>

          {/* Notification List */}
          {activeTab === "notifications" ? (
            <div
              className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5"
              data-testid="notification-list"
            >
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    No notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDismiss={dismiss}
                  />
                ))
              )}
            </div>
          ) : (
            <NotificationHistoryPanel activityLog={activityLog} />
          )}
        </div>
      )}
    </div>
  );
}
