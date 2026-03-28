export interface RecentPR {
  title: string;
  repo: string;
  status: "open" | "merged" | "closed";
  ciStatus: "passing" | "failing" | "pending" | "unknown";
  createdAt: string;
  url: string;
  number: number;
  author: string;
  hasConflicts?: boolean;
  reviewStatus?: "approved" | "changes_requested" | "pending" | "none";
  mergedAt?: string;
}

export type PRGroupKey = "awaiting-ci" | "awaiting-review" | "ready-to-merge" | "merged-today";

export interface PRGroup {
  key: PRGroupKey;
  label: string;
  prs: RecentPR[];
}
