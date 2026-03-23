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
}
