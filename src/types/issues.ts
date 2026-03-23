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
