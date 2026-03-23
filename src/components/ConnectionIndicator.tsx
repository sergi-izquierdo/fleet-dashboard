import type { ConnectionStatus } from "@/hooks/useDashboardData";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

const statusConfig: Record<
  ConnectionStatus,
  { color: string; label: string; pulse: boolean }
> = {
  connected: { color: "bg-green-500", label: "Connected", pulse: true },
  disconnected: { color: "bg-yellow-500", label: "Connecting...", pulse: false },
  error: { color: "bg-red-500", label: "Connection error", pulse: false },
};

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const { color, label, pulse } = statusConfig[status];

  return (
    <div className="flex items-center gap-2" data-testid="connection-indicator">
      <span className="relative inline-flex h-2.5 w-2.5">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${color}`}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`}
          data-testid="connection-dot"
          aria-hidden="true"
        />
      </span>
      <span className="text-xs text-gray-500 dark:text-white/60">{label}</span>
    </div>
  );
}
