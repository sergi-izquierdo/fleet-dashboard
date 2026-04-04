"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  /**
   * When true, a decrease is green (good) and an increase is red (bad).
   * Use for metrics where lower is better (e.g. failures, timeouts).
   */
  invertColor?: boolean;
  /** Label for the comparison period, e.g. "last week" or "last day" */
  periodLabel?: string;
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export default function TrendIndicator({
  current,
  previous,
  invertColor = false,
  periodLabel = "last week",
}: TrendIndicatorProps) {
  const delta = current - previous;

  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-white/40">
        <Minus className="w-3 h-3" aria-hidden="true" />
        <span>same as {periodLabel}</span>
      </span>
    );
  }

  const isPositive = delta > 0;
  // improvement = positive delta and normal color, OR negative delta and inverted color
  const isImprovement = invertColor ? !isPositive : isPositive;

  const colorClass = isImprovement
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>
        {formatDelta(delta)} vs {periodLabel}
      </span>
    </span>
  );
}

/** Compact block variant that shows the value and trend stacked */
export function TrendIndicatorBlock({
  label,
  current,
  previous,
  invertColor = false,
  periodLabel = "last week",
}: TrendIndicatorProps & { label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/50">
        <span>{label}:</span>
        <span className="font-semibold text-gray-900 dark:text-white">{current}</span>
      </div>
      <TrendIndicator
        current={current}
        previous={previous}
        invertColor={invertColor}
        periodLabel={periodLabel}
      />
    </div>
  );
}
