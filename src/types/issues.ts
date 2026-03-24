export interface RepoIssueProgress {
  repo: string;
  total: number;
  open: number;
  closed: number;
  percentComplete: number;
  labels: {
    queued: number; // agent-local
    inProgress: number; // agent-working
    cloud: number; // agent-cloud
    done: number; // closed
  };
}

export interface FleetIssueProgress {
  repos: RepoIssueProgress[];
  overall: {
    total: number;
    open: number;
    closed: number;
    percentComplete: number;
    labels: {
      queued: number;
      inProgress: number;
      cloud: number;
      done: number;
    };
  };
}

export interface RepoIssueDetail {
  number: number;
  title: string;
  labels: string[];
  url: string;
}

export interface RepoPRDetail {
  number: number;
  title: string;
  url: string;
  author: string;
  ciStatus: "passing" | "failing" | "pending" | "unknown";
  createdAt: string;
}

export interface RepoDetailData {
  repo: string;
  openIssues: RepoIssueDetail[];
  openPRs: RepoPRDetail[];
  recentMergedPRs: RepoPRDetail[];
}
