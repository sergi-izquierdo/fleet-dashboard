import type { ConnectionStatus } from "@/hooks/useDashboardData";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

const statusConfig: Record<
  ConnectionStatus,
  { color: string; label: string }
> = {
  connected: { color: "bg-green-500", label: "Connected" },
  disconnected: { color: "bg-yellow-500", label: "Connecting..." },
  error: { color: "bg-red-500", label: "Connection error" },
};

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const { color, label } = statusConfig[status];

  return (
    <div className="flex items-center gap-2" data-testid="connection-indicator">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
        data-testid="connection-dot"
        aria-hidden="true"
      />
      <span className="text-xs text-white/60">{label}</span>
    </div>
  );
}
