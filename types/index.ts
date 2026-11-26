export interface Project {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id?: string;
  project_id: string | null;
  description: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  is_manual: boolean;
  created_at?: string;
}

export type TimePeriod = 'day' | 'week' | 'month';

export interface AnalyticsSummary {
  totalSeconds: number;
  totalHours: string;
  entryCount: number;
  taskBreakdown: {
    description: string;
    seconds: number;
    hours: string;
    percentage: number;
  }[];
}
