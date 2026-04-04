"use client";

/**
 * Dynamically-imported chart components with loading skeletons.
 * Use these instead of direct imports to lazy-load recharts from the main bundle.
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/LoadingSkeleton";

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton height={height} className="w-full" />;
}

export const DynamicCostTimeline = dynamic(
  () => import("@/components/CostTimeline"),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);

export const DynamicCostByProject = dynamic(
  () => import("@/components/CostByProject"),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);

export const DynamicCostAnalytics = dynamic(
  () => import("@/components/CostAnalytics"),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);

export const DynamicPRTrendChart = dynamic(
  () => import("@/components/PRTrendChart"),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);

export const DynamicPRVelocityChart = dynamic(
  () => import("@/components/PRVelocityChart"),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);

export const DynamicTokenUsageDashboard = dynamic(
  () => import("@/components/TokenUsageDashboard"),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);
