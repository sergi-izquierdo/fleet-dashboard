export interface TokenUsageEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface ProjectTokenUsage {
  name: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export type TimeRange = "daily" | "weekly" | "monthly";

export interface TokenUsageResponse {
  timeSeries: TokenUsageEntry[];
  byProject: ProjectTokenUsage[];
  totalCost: number;
  totalTokens: number;
}
