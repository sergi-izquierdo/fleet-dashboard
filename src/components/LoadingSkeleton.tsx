function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 ${className ?? ""}`}
    />
  );
}

export function Skeleton({
  width,
  height,
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 ${className}`}
      style={style}
      data-testid="skeleton"
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in"
      data-testid="loading-skeleton"
    >
      {/* Full-width banner skeleton (matching FleetStatusBanner h-14) */}
      <Pulse className="h-14 w-full" />

      {/* 12-column grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: col-span-8 */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Agent card grid skeleton (2x2) */}
          <div className="grid grid-cols-2 gap-4">
            <Pulse className="h-40" />
            <Pulse className="h-40" />
            <Pulse className="h-40" />
            <Pulse className="h-40" />
          </div>

          {/* Timeline bar skeleton */}
          <Pulse className="h-20 w-full" />

          {/* 2-col sub-grid skeletons for PR sections */}
          <div className="grid grid-cols-2 gap-4">
            <Pulse className="h-48" />
            <Pulse className="h-48" />
          </div>
        </div>

        {/* Right column: col-span-4 */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Pipeline panel skeleton */}
          <Pulse className="h-40" />

          {/* Service health skeleton */}
          <Pulse className="h-32" />

          {/* Progress tracker skeleton */}
          <Pulse className="h-48" />
        </div>
      </div>
    </div>
  );
}
