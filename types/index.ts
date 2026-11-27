export type EntrySource = 'timer' | 'manual' | 'adjusted';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  is_billable: boolean;
  hourly_rate: number | null;
  is_archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  project_id: string | null;
  title: string;
  priority: TaskPriority;
  estimate_seconds: number | null;
  /** Local calendar day this card belongs to, YYYY-MM-DD */
  day: string;
  /** Shared by the same task across different days */
  thread_id: string;
  created_at: string;
}

/** One session of a task. `description` mirrors the task title. */
export interface TimeEntry {
  id: string;
  user_id?: string;
  task_id: string | null;
  project_id: string | null;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  source: EntrySource;
  created_at?: string;
}

export type TimePeriod = 'day' | 'week' | 'month';

export interface AnalyticsSummary {
  totalSeconds: number;
  totalHours: string;
  entryCount: number;
  activeDays: number;
  focusBlocksCount: number;
  timerSeconds: number;
  manualSeconds: number;
  taskBreakdown: {
    description: string;
    projectId: string | null;
    seconds: number;
    hours: string;
    percentage: number;
  }[];
}
