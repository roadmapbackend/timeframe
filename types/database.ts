export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_billable: boolean;
          hourly_rate: number | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          color?: string;
          is_billable?: boolean;
          hourly_rate?: number | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          is_billable?: boolean;
          hourly_rate?: number | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          priority: 'low' | 'medium' | 'high';
          status: 'todo' | 'in_progress' | 'done';
          estimate_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'done';
          estimate_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'done';
          estimate_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          project_id: string | null;
          description: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          source: 'timer' | 'manual' | 'adjusted';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          project_id?: string | null;
          description?: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          source?: 'timer' | 'manual' | 'adjusted';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          project_id?: string | null;
          description?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          source?: 'timer' | 'manual' | 'adjusted';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
