'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TimeEntry, EntrySource } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_KEY_ENTRIES } from '@/lib/constants';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const runningEntry = useMemo(
    () => entries.find((e) => e.ended_at === null) || null,
    [entries]
  );

  const completedEntries = useMemo(
    () => entries.filter((e) => e.ended_at !== null),
    [entries]
  );

  // Live ticker for the server-synced running entry
  useEffect(() => {
    if (!runningEntry) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(runningEntry.started_at).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningEntry]);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*')
          .order('started_at', { ascending: false });

        if (!error && data) {
          setEntries(data as TimeEntry[]);
          setIsCloudConnected(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(data));
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local cache', err);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY_ENTRIES);
      if (cached) {
        try {
          setEntries(JSON.parse(cached));
        } catch {
          setEntries([]);
        }
      }
    }
    setIsCloudConnected(false);
    setIsLoading(false);
  }, []);

  // Initial load + Supabase Realtime subscription for instant cross-device sync
  useEffect(() => {
    loadEntries();

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('time_entries_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries' },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEntries]);

  const persistLocal = (next: TimeEntry[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(next));
    }
  };

  // Start server-synced timer (stops any existing running entry first if needed)
  const startTimer = useCallback(
    async (description: string, projectId: string | null = null) => {
      const nowIso = new Date().toISOString();

      // If one is already running, close it cleanly first
      if (runningEntry) {
        const dur = Math.max(
          1,
          Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000)
        );
        const supabase = createClient();
        if (supabase) {
          await supabase
            .from('time_entries')
            .update({ ended_at: nowIso, duration_seconds: dur })
            .eq('id', runningEntry.id);
        }
      }

      const newRunning: TimeEntry = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `entry-${Date.now()}`,
        task_id: null,
        project_id: projectId,
        description: description.trim() || 'Deep Work',
        started_at: nowIso,
        ended_at: null,
        duration_seconds: null,
        source: 'timer',
        created_at: nowIso,
      };

      setEntries((prev) => {
        const cleaned = prev.map((e) =>
          e.ended_at === null
            ? {
                ...e,
                ended_at: nowIso,
                duration_seconds: Math.max(
                  1,
                  Math.floor((Date.now() - new Date(e.started_at).getTime()) / 1000)
                ),
              }
            : e
        );
        const next = [newRunning, ...cleaned];
        persistLocal(next);
        return next;
      });

      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').insert([
          {
            id: newRunning.id,
            description: newRunning.description,
            project_id: newRunning.project_id,
            started_at: newRunning.started_at,
            ended_at: null,
            duration_seconds: null,
            source: 'timer',
          },
        ]);
      }
    },
    [runningEntry]
  );

  // Stop the active server-synced timer (supports forgotten-timer recovery custom end time)
  const stopTimer = useCallback(
    async (customEndedAt?: Date) => {
      if (!runningEntry) return;
      const endMs = customEndedAt ? customEndedAt.getTime() : Date.now();
      const startMs = new Date(runningEntry.started_at).getTime();
      const safeEndMs = Math.max(startMs + 1000, endMs);
      const endedAt = new Date(safeEndMs).toISOString();
      const durationSeconds = Math.max(1, Math.floor((safeEndMs - startMs) / 1000));
      const source: EntrySource = customEndedAt ? 'adjusted' : 'timer';

      setEntries((prev) => {
        const next = prev.map((e) =>
          e.id === runningEntry.id
            ? { ...e, ended_at: endedAt, duration_seconds: durationSeconds, source }
            : e
        );
        persistLocal(next);
        return next;
      });

      const supabase = createClient();
      if (supabase) {
        await supabase
          .from('time_entries')
          .update({ ended_at: endedAt, duration_seconds: durationSeconds, source })
          .eq('id', runningEntry.id);
      }
    },
    [runningEntry]
  );

  // Add manual / quick-add entry ("ended now" by default)
  const addManualEntry = useCallback(
    async (entryData: {
      description: string;
      projectId?: string | null;
      startedAt: string;
      endedAt: string;
      durationSeconds: number;
      source?: EntrySource;
    }) => {
      const newEntry: TimeEntry = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `entry-${Date.now()}`,
        task_id: null,
        project_id: entryData.projectId ?? null,
        description: entryData.description.trim() || 'Untitled Task',
        started_at: entryData.startedAt,
        ended_at: entryData.endedAt,
        duration_seconds: entryData.durationSeconds,
        source: entryData.source ?? 'manual',
        created_at: new Date().toISOString(),
      };

      setEntries((prev) => {
        const next = [newEntry, ...prev].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        persistLocal(next);
        return next;
      });

      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').insert([
          {
            id: newEntry.id,
            description: newEntry.description,
            project_id: newEntry.project_id,
            started_at: newEntry.started_at,
            ended_at: newEntry.ended_at,
            duration_seconds: newEntry.duration_seconds,
            source: newEntry.source,
          },
        ]);
      }
    },
    []
  );

  // Update entry inline
  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    setEntries((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      persistLocal(next);
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('time_entries').update(updates).eq('id', id);
    }
  }, []);

  // Delete entry (returns deleted entry so caller can offer Undo toast)
  const deleteEntry = useCallback(
    async (id: string): Promise<TimeEntry | null> => {
      const target = entries.find((e) => e.id === id) || null;
      setEntries((prev) => {
        const next = prev.filter((item) => item.id !== id);
        persistLocal(next);
        return next;
      });

      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').delete().eq('id', id);
      }
      return target;
    },
    [entries]
  );

  // Restore deleted entry for Undo toast
  const restoreEntry = useCallback(async (entry: TimeEntry) => {
    setEntries((prev) => {
      const next = [entry, ...prev].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      persistLocal(next);
      return next;
    });

    const supabase = createClient();
    if (supabase) {
      await supabase.from('time_entries').insert([
        {
          id: entry.id,
          description: entry.description,
          project_id: entry.project_id,
          started_at: entry.started_at,
          ended_at: entry.ended_at,
          duration_seconds: entry.duration_seconds,
          source: entry.source,
        },
      ]);
    }
  }, []);

  return {
    entries: completedEntries,
    runningEntry,
    elapsedSeconds,
    isRunning: !!runningEntry,
    isLoading,
    isCloudConnected,
    startTimer,
    stopTimer,
    addManualEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    refreshEntries: loadEntries,
  };
}
