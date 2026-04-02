export interface AgentCostEntry {
  timestamp: string;
  session_id: string;
  agent_name: string;
  model: string;
  cwd: string;
  transcript_path: string;
  transcript_lines: number;
}

export interface ProjectCost {
  name: string;
  sessionCount: number;
  transcriptLines: number;
  lastActive: string;
}

export interface CostsByProjectResponse {
  projects: ProjectCost[];
  period: "7d" | "all";
}
