import type { FleetIssueProgress } from "@/types/issues";

const CACHE_TTL_MS = 60_000;

let cachedResult: FleetIssueProgress | null = null;
let cachedAt = 0;

export function getCached(): FleetIssueProgress | null {
  if (cachedResult && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }
  return null;
}

export function setCache(result: FleetIssueProgress): void {
  cachedResult = result;
  cachedAt = Date.now();
}

export function resetCache(): void {
  cachedResult = null;
  cachedAt = 0;
}
