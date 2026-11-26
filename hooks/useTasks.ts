'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';

const LOCAL_TASKS_KEY = 'notion_tasks_backup_v1';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data as Task[]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(data));
        }
        setIsLoading(false);
        return;
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_TASKS_KEY);
      if (cached) {
        try {
          setTasks(JSON.parse(cached));
        } catch {
          setTasks([]);
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const persistLocal = (next: Task[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(next));
    }
  };

  const createTask = useCallback(
    async (input: {
      title: string;
      projectId?: string | null;
      priority?: TaskPriority;
      estimateSeconds?: number | null;
    }): Promise<Task | null> => {
      const title = input.title.trim();
      if (!title) return null;

      const newTask: Task = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `task-${Date.now()}`,
        title,
        project_id: input.projectId ?? null,
        priority: input.priority ?? 'medium',
        status: 'todo',
        estimate_seconds: input.estimateSeconds ?? null,
        created_at: new Date().toISOString(),
      };

      setTasks((prev) => {
        const next = [newTask, ...prev];
        persistLocal(next);
        return next;
      });

      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('tasks')
          .insert([
            {
              id: newTask.id,
              title: newTask.title,
              project_id: newTask.project_id,
              priority: newTask.priority,
              status: newTask.status,
              estimate_seconds: newTask.estimate_seconds,
            },
          ])
          .select()
          .single();

        if (!error && data) return data as Task;
      }

      return newTask;
    },
    []
  );

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      persistLocal(next);
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('tasks').update(updates).eq('id', id);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistLocal(next);
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  }, []);

  const cycleStatus = useCallback(
    async (task: Task) => {
      const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
      const nextStatus = order[(order.indexOf(task.status) + 1) % order.length];
      await updateTask(task.id, { status: nextStatus });
    },
    [updateTask]
  );

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    cycleStatus,
    refreshTasks: loadTasks,
  };
}
