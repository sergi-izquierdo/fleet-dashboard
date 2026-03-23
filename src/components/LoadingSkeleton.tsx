function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 animate-shimmer ${className ?? ""}`}
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in"
      data-testid="loading-skeleton"
    >
      {/* Stats Bar skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 stagger-children">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-20" />
        ))}
      </div>

      {/* Agent Cards skeleton */}
      <div>
        <Pulse className="mb-4 h-6 w-24" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-40" />
          ))}
        </div>
      </div>

      {/* Activity Log skeleton */}
      <Pulse className="h-64" />
    </div>
  );
}
