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
          user_id: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          description: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          is_manual: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          description?: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          is_manual?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          description?: string;
          started_at?: string;
          ended_at?: string;
          duration_seconds?: number;
          is_manual?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
