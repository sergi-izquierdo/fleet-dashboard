"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/Card";
import TrendIndicator from "@/components/TrendIndicator";
import { useStatsComparison } from "@/hooks/useStatsComparison";
import type { FleetHealthResponse, RepeatFailure } from "@/lib/fleetHealth";

// SVG donut chart constants
const RADIUS = 40;
const STROKE_WIDTH = 12;
const CENTER = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DonutSegment {
  color: string;
  value: number;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
  centerColor: string;
}

function DonutChart({ segments, total, centerLabel, centerColor }: DonutChartProps) {
  if (total === 0) {
    return (
      <svg
        viewBox="0 0 100 100"
        className="w-32 h-32"
        role="img"
        aria-label="No data"
        data-testid="donut-chart"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          className="text-gray-200 dark:text-white/10"
        />
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-400 dark:fill-white/40 text-[10px]"
          fontSize="10"
        >
          —
        </text>
      </svg>
    );
  }

  const renderedSegments = segments
    .filter((s) => s.value > 0)
    .reduce<
      Array<DonutSegment & { dashLength: number; dashOffset: number; runningOffset: number }>
    >((acc, seg) => {
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].runningOffset : 0;
      const fraction = seg.value / total;
      const dashLength = fraction * CIRCUMFERENCE;
      return [
        ...acc,
        { ...seg, dashLength, dashOffset: -prevOffset, runningOffset: prevOffset + dashLength },
      ];
    }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-32 h-32 -rotate-90"
      role="img"
      aria-label="Fleet health donut chart"
      data-testid="donut-chart"
    >
      {/* Background track */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-gray-100 dark:text-white/[0.05]"
      />
      {renderedSegments.map((seg, i) => (
        <circle
          key={i}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={seg.color}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${seg.dashLength} ${CIRCUMFERENCE - seg.dashLength}`}
          strokeDashoffset={seg.dashOffset}
          strokeLinecap="butt"
          data-testid={`donut-segment-${seg.label}`}
        />
      ))}
      {/* Center text — rotated back upright */}
      <text
        x={CENTER}
        y={CENTER - 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="bold"
        className={`rotate-90 origin-center ${centerColor}`}
        style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}
        fill="currentColor"
      >
        {centerLabel}
      </text>
      <text
        x={CENTER}
        y={CENTER + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        className="fill-gray-400 dark:fill-white/40"
        style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}
        fill="currentColor"
      >
        success
      </text>
    </svg>
  );
}

interface RepeatFailuresListProps {
  failures: RepeatFailure[];
}

function RepeatFailuresList({ failures }: RepeatFailuresListProps) {
  if (failures.length === 0) {
    return (
      <p
        className="text-xs text-gray-500 dark:text-white/40 italic"
        data-testid="no-repeat-failures"
      >
        No repeat failures — fleet is healthy
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="repeat-failures-list">
      {failures.map((f) => (
        <li key={f.key} className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <a
              href={`https://github.com/${f.repo}/issues/${f.issue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
            >
              #{f.issue} {f.title !== f.key ? f.title : `Issue ${f.issue}`}
            </a>
            <span className="text-[10px] text-gray-400 dark:text-white/30">{f.repo}</span>
          </div>
          <span className="flex-shrink-0 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 rounded px-1.5 py-0.5">
            ×{f.recycleCount}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function FleetHealthCard() {
  const [data, setData] = useState<FleetHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const comparison = useStatsComparison("7d");

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as FleetHealthResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const successRateColor = (rate: number | null) => {
    if (rate === null) return "text-gray-400 dark:text-white/40";
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const segments: DonutSegment[] = data
    ? [
        { label: "merged", color: "#22c55e", value: data.merged },
        { label: "failed", color: "#ef4444", value: data.failed },
        { label: "timeout", color: "#f97316", value: data.timeout },
        { label: "recycled", color: "#9ca3af", value: data.recycled },
      ]
    : [];

  const centerLabel =
    data?.successRate !== null && data?.successRate !== undefined
      ? `${data.successRate}%`
      : "—";

  return (
    <Card data-testid="fleet-health-card">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white/70">
          Fleet Health
        </h2>
        <span className="text-[10px] text-gray-400 dark:text-white/30">last 7 days</span>
        {comparison && (
          <TrendIndicator
            current={comparison.current.merged}
            previous={comparison.previous.merged}
            periodLabel="last week"
          />
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-2" data-testid="health-error">
          {error}
        </p>
      )}

      {!data && !error && (
        <div className="animate-pulse space-y-2" data-testid="health-loading">
          <div className="h-32 w-32 mx-auto rounded-full bg-gray-100 dark:bg-white/[0.05]" />
          <div className="h-3 w-24 mx-auto rounded bg-gray-100 dark:bg-white/[0.05]" />
        </div>
      )}

      {data && (
        <>
          {/* Donut chart + success rate */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="relative">
              <DonutChart
                segments={segments}
                total={data.total}
                centerLabel={centerLabel}
                centerColor={successRateColor(data.successRate)}
              />
            </div>
            <p
              className={`text-2xl font-bold ${successRateColor(data.successRate)}`}
              data-testid="success-rate"
            >
              {data.successRate !== null ? `${data.successRate}%` : "—"}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-white/30">success rate</p>
          </div>

          {/* Counts row */}
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-xs"
            data-testid="health-counts"
          >
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-700 dark:text-white/60">{data.merged} merged</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-700 dark:text-white/60">{data.failed} failed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-700 dark:text-white/60">{data.timeout} timed out</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-700 dark:text-white/60">{data.recycled} recycled</span>
            </span>
          </div>

          {/* Repeat failures */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 dark:text-white/50 mb-2">
              Repeat Failures
            </h3>
            <RepeatFailuresList failures={data.repeatFailures} />
          </div>
        </>
      )}
    </Card>
  );
}
