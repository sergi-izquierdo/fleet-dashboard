"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing || startYRef.current === 0) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0) {
        // Apply resistance: the further you pull, the harder it gets
        const distance = Math.min(diff * 0.5, THRESHOLD * 1.5);
        setPullDistance(distance);
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startYRef.current = 0;
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative overflow-auto" data-testid="pull-to-refresh">
      {/* Pull indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out md:hidden"
        style={{ height: pullDistance > 10 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 48 : 0) : 0 }}
        aria-hidden="true"
      >
        <div
          className={`h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={!isRefreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
        />
      </div>
      {children}
    </div>
  );
}
