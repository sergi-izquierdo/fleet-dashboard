export type SessionStatus = "working" | "idle" | "stuck";

export interface TmuxSession {
  name: string;
  status: SessionStatus;
  uptime: string;
  branch: string;
  taskName: string;
}

export interface SessionsResponse {
  sessions: TmuxSession[];
  error?: string;
}
