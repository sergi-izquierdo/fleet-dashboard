export interface TimelineSeries {
  project: string;
  data: number[];
}

export interface CostsTimelineResponse {
  dates: string[];
  series: TimelineSeries[];
  days: number;
  breakdown: DailyBreakdown[];
}

export interface DailyProjectBreakdown {
  name: string;
  sessions: number;
  transcriptLines: number;
}

export interface DailyBreakdown {
  date: string;
  totalSessions: number;
  topProject: string;
  transcriptLines: number;
  projects: DailyProjectBreakdown[];
}

export type TimelineDays = 7 | 14 | 30 | 0;
