export interface AgentCostEntry {
  agent: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: string;
}

export interface ProjectCost {
  name: string;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  lastActive: string;
}

export interface CostsByProjectResponse {
  projects: ProjectCost[];
  period: "7d" | "all";
}
