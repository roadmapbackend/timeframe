'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskPriority } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { newId, normalizeTitle, todayKey } from '@/lib/utils';

const LOCAL_TASKS_KEY = 'notion_tasks_backup_v2';

/**
 * Tasks are day-scoped cards: one title per calendar day.
 * The same title on different days shares a thread_id.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Always-current copy so async flows can see tasks created moments ago
  const tasksRef = useRef<Task[]>([]);

  const reportError = useCallback(
    (op: string, error: { message?: string; code?: string; hint?: string } | null) => {
      if (!error) return;
      const msg = error.message || error.code || 'Unknown database error';
      console.warn(`[useTasks:${op}]`, { code: error.code, message: msg, hint: error.hint });
      setSyncError(`Tasks ${op}: ${msg}`);
    },
    []
  );

  const commit = useCallback((updater: (prev: Task[]) => Task[]) => {
    const next = updater(tasksRef.current);
    tasksRef.current = next;
    setTasks(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(next));
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('day', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        commit(() => data as Task[]);
        setIsLoading(false);
        return;
      }
      if (error) reportError('load', error);
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOCAL_TASKS_KEY);
      if (cached) {
        try {
          commit(() => JSON.parse(cached));
        } catch {
          commit(() => []);
        }
      }
    }
    setIsLoading(false);
  }, [commit]);

  useEffect(() => {
    loadTasks();

    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);

  const findTaskForDay = useCallback((day: string, title: string): Task | null => {
    const norm = normalizeTitle(title);
    return (
      tasksRef.current.find((t) => t.day === day && normalizeTitle(t.title) === norm) ||
      null
    );
  }, []);

  const findThreadTaskForDay = useCallback(
    (day: string, threadId: string): Task | null =>
      tasksRef.current.find((t) => t.day === day && t.thread_id === threadId) || null,
    []
  );

  /** "Untitled N" where N is one more than the highest Untitled number on that day */
  const nextUntitledTitle = useCallback((day: string = todayKey()): string => {
    let max = 0;
    tasksRef.current.forEach((t) => {
      if (t.day !== day) return;
      const m = t.title.trim().match(/^untitled\s+(\d+)$/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `Untitled ${max + 1}`;
  }, []);

  /**
   * Create a task card for a day. If a card with this title already exists that day,
   * returns it instead. A new card joins the thread of the latest task with the same title.
   */
  const createTask = useCallback(
    async (input: {
      title: string;
      day?: string;
      projectId?: string | null;
      priority?: TaskPriority;
      estimateSeconds?: number | null;
      threadId?: string;
    }): Promise<Task | null> => {
      const title = input.title.trim().replace(/\s+/g, ' ');
      if (!title) return null;
      const day = input.day ?? todayKey();

      const existing = findTaskForDay(day, title);
      if (existing) return existing;

      const norm = normalizeTitle(title);
      const sameTitle = tasksRef.current
        .filter((t) => normalizeTitle(t.title) === norm)
        .sort((a, b) => b.day.localeCompare(a.day))[0];

      const id = newId();
      const newTask: Task = {
        id,
        title,
        day,
        thread_id: input.threadId ?? sameTitle?.thread_id ?? id,
        project_id: input.projectId ?? sameTitle?.project_id ?? null,
        priority: input.priority ?? sameTitle?.priority ?? 'medium',
        estimate_seconds: input.estimateSeconds ?? null,
        created_at: new Date().toISOString(),
      };

      commit((prev) => [newTask, ...prev]);

      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('tasks').insert([
          {
            id: newTask.id,
            title: newTask.title,
            day: newTask.day,
            thread_id: newTask.thread_id,
            project_id: newTask.project_id,
            priority: newTask.priority,
            estimate_seconds: newTask.estimate_seconds,
          },
        ]);

        // Another device created the same card first: use that one
        if (error?.code === '23505') {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('day', day)
            .ilike('title', title);
          const remote = (data as Task[] | null)?.find(
            (t) => normalizeTitle(t.title) === norm
          );
          if (remote) {
            commit((prev) => [remote, ...prev.filter((t) => t.id !== newTask.id)]);
            return remote;
          }
        } else if (error) {
          reportError('insert', error);
        }
      }

      return newTask;
    },
    [commit, findTaskForDay]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      commit((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      const supabase = createClient();
      if (supabase) {
        await supabase.from('tasks').update(updates).eq('id', id);
      }
    },
    [commit]
  );

  /** Deletes the task; its sessions are deleted with it (on delete cascade) */
  const deleteTask = useCallback(
    async (id: string) => {
      commit((prev) => prev.filter((t) => t.id !== id));
      const supabase = createClient();
      if (supabase) {
        await supabase.from('tasks').delete().eq('id', id);
      }
    },
    [commit]
  );

  const restoreTask = useCallback(
    async (task: Task) => {
      commit((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
      const supabase = createClient();
      if (supabase) {
        const row: Partial<Task> = { ...task };
        delete row.user_id;
        await supabase.from('tasks').upsert([row]);
      }
    },
    [commit]
  );

  return {
    tasks,
    isLoading,
    syncError,
    clearSyncError: () => setSyncError(null),
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    findTaskForDay,
    findThreadTaskForDay,
    nextUntitledTitle,
    refreshTasks: loadTasks,
  };
}
