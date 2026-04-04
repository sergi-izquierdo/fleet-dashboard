"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

const typeConfig: Record<ToastMessage["type"], { icon: string; className: string }> = {
  success: {
    icon: "\u2713",
    className: "border-green-500/30 bg-green-500/10 text-green-400",
  },
  error: {
    icon: "\u2717",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  info: {
    icon: "\u2139",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  warning: {
    icon: "!",
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
};

const TOAST_DURATION = 4000;

let toastListeners: Array<(toast: ToastMessage) => void> = [];

export function showToast(toast: Omit<ToastMessage, "id">) {
  const message: ToastMessage = { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  toastListeners.forEach((listener) => listener(message));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastMessage & { exiting?: boolean })[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback(
    (toast: ToastMessage) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
      const timer = setTimeout(() => removeToast(toast.id), TOAST_DURATION);
      timersRef.current.set(toast.id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast);
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80"
      data-testid="toast-container"
    >
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            data-testid="toast"
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
            className={`${toast.exiting ? "animate-toast-exit" : "animate-toast-enter"} rounded-lg border p-3 shadow-lg backdrop-blur-sm ${config.className}`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" aria-hidden="true">
                {config.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-xs opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
