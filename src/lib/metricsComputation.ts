import type { ActivityEvent } from "@/types/dashboard";

export interface FleetMetrics {
  totalAgentsRun: number;
  successRate: number | null;
  mostActiveProject: string | null;
  successCount: number;
  errorCount: number;
}

/**
 * Compute fleet-wide metrics from the activity log (completed agent entries).
 * Each entry in activityLog represents one completed agent run.
 */
export function computeFleetMetrics(activityLog: ActivityEvent[]): FleetMetrics {
  const total = activityLog.length;

  if (total === 0) {
    return {
      totalAgentsRun: 0,
      successRate: null,
      mostActiveProject: null,
      successCount: 0,
      errorCount: 0,
    };
  }

  // "deploy" eventType maps from pr_merged status — counts as success
  const successCount = activityLog.filter((e) => e.eventType === "deploy").length;
  // "error" eventType maps from timeout status — counts as failure
  const errorCount = activityLog.filter((e) => e.eventType === "error").length;

  const successRate = Math.round((successCount / total) * 100);

  // Find the most active project (highest agent count by project field)
  const projectCounts = new Map<string, number>();
  for (const event of activityLog) {
    const project = event.project;
    if (project) {
      projectCounts.set(project, (projectCounts.get(project) ?? 0) + 1);
    }
  }

  let mostActiveProject: string | null = null;
  let maxCount = 0;
  for (const [project, count] of projectCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveProject = project;
    }
  }

  return {
    totalAgentsRun: total,
    successRate,
    mostActiveProject,
    successCount,
    errorCount,
  };
}
