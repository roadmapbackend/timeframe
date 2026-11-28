'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { NOTION_COLORS } from '@/lib/constants';

const LOCAL_PROJECTS_KEY = 'notion_projects_backup_v1';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setProjects(data as Project[]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(data));
        }
        return;
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (cached) {
        try {
          setProjects(JSON.parse(cached));
        } catch {
          setProjects([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = useCallback(
    async (name: string, color?: string): Promise<Project | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const pickedColor =
        color || NOTION_COLORS[projects.length % NOTION_COLORS.length].hex;

      const newProject: Project = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `proj-${Date.now()}`,
        name: trimmed,
        color: pickedColor,
        is_billable: false,
        hourly_rate: null,
        is_archived: false,
        created_at: new Date().toISOString(),
      };

      setProjects((prev) => [...prev, newProject]);

      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('projects')
          .insert([
            {
              id: newProject.id,
              name: newProject.name,
              color: newProject.color,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          return data as Project;
        }
      }

      if (typeof window !== 'undefined') {
        const current = JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]');
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify([...current, newProject]));
      }
      return newProject;
    },
    [projects.length]
  );

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(next));
      }
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('projects').update(updates).eq('id', id);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(next));
      }
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('projects').delete().eq('id', id);
    }
  }, []);

  return {
    projects,
    activeProjects: projects.filter((p) => !p.is_archived),
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
}
