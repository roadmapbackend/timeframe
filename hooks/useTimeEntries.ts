'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react';
import { TimeEntry, EntrySource, Task } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_KEY_ENTRIES } from '@/lib/constants';
import { formatDuration, newId } from '@/lib/utils';

/** A new session starting this soon after the task's last one ended is joined to it */
export const JOIN_WINDOW_SECONDS = 60;
/** A timer session shorter than this is treated as an accidental start and discarded */
export const DISCARD_UNDER_SECONDS = 5;

const byStartDesc = (a: TimeEntry, b: TimeEntry) =>
  new Date(b.started_at).getTime() - new Date(a.started_at).getTime();

function toRow(e: TimeEntry) {
  return {
    id: e.id,
    task_id: e.task_id,
    project_id: e.project_id,
    description: e.description,
    started_at: e.started_at,
    ended_at: e.ended_at,
    duration_seconds: e.duration_seconds,
    source: e.source,
  };
}

/** Sessions (time entries). Every session belongs to a task. */
export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const entriesRef = useRef<TimeEntry[]>([]);
  const channelId = useId();

  const reportError = useCallback(
    (op: string, error: { message?: string; code?: string; hint?: string } | null) => {
      if (!error) return;
      const msg = error.message || error.code || 'Unknown database error';
      console.warn(`[useTimeEntries:${op}]`, { code: error.code, message: msg, hint: error.hint });
      setSyncError(`Sync ${op}: ${msg}`);
    },
    []
  );

  const commit = useCallback(
    (updater: (prev: TimeEntry[]) => TimeEntry[]) => {
      const next = updater(entriesRef.current).sort(byStartDesc);
      entriesRef.current = next;
      setEntries(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent('timeframe:entries-sync', {
            detail: { sourceId: channelId, next },
          })
        );
      }
    },
    [channelId]
  );

  const runningEntry = useMemo(
    () => entries.find((e) => e.ended_at === null) || null,
    [entries]
  );

  const completedEntries = useMemo(
    () => entries.filter((e) => e.ended_at !== null),
    [entries]
  );

  // Live ticker + browser tab title for the running session
  useEffect(() => {
    if (!runningEntry) {
      setElapsedSeconds(0);
      if (typeof document !== 'undefined') document.title = 'Timeframe';
      return;
    }

    const startMs = new Date(runningEntry.started_at).getTime();
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(secs);
      if (typeof document !== 'undefined') {
        document.title = `${formatDuration(secs)} · ${runningEntry.description} — Timeframe`;
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      if (typeof document !== 'undefined') document.title = 'Timeframe';
    };
  }, [runningEntry]);

  const loadEntries = useCallback(async () => {
    const supabase = createClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*')
          .order('started_at', { ascending: false });

        if (!error && data) {
          commit(() => data as TimeEntry[]);
          setIsCloudConnected(true);
          setIsLoading(false);
          return;
        }
        if (error) reportError('load', error);
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local cache', err);
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY_ENTRIES);
      if (cached) {
        try {
          commit(() => JSON.parse(cached));
        } catch {
          commit(() => []);
        }
      }
    }
    setIsCloudConnected(false);
    setIsLoading(false);
  }, [commit]);

  // Initial load + Realtime subscription for cross-device sync
  useEffect(() => {
    loadEntries();

    const onFocus = () => loadEntries();
    const onLocalSync = (ev: Event) => {
      const { sourceId, next } = (
        ev as CustomEvent<{ sourceId: string; next: TimeEntry[] }>
      ).detail;
      if (sourceId === channelId) return;
      entriesRef.current = next;
      setEntries(next);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('timeframe:entries-sync', onLocalSync);

    const supabase = createClient();
    if (!supabase) {
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('timeframe:entries-sync', onLocalSync);
      };
    }

    const channel = supabase
      .channel(`time_entries_realtime_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => {
        loadEntries();
      })
      .subscribe();

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('timeframe:entries-sync', onLocalSync);
      supabase.removeChannel(channel);
    };
  }, [loadEntries, channelId]);

  /** Close whatever session is running (no discard rule: used when switching tasks) */
  const closeRunning = useCallback(
    async (endMs: number) => {
      const running = entriesRef.current.find((e) => e.ended_at === null);
      if (!running) return;
      const startMs = new Date(running.started_at).getTime();
      const safeEnd = Math.max(startMs + 1000, endMs);
      const updates = {
        ended_at: new Date(safeEnd).toISOString(),
        duration_seconds: Math.max(1, Math.floor((safeEnd - startMs) / 1000)),
      };
      commit((prev) => prev.map((e) => (e.id === running.id ? { ...e, ...updates } : e)));
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase
          .from('time_entries')
          .update(updates)
          .eq('id', running.id);
        if (error) reportError('stop', error);
      }
    },
    [commit]
  );

  /**
   * Start a timer session on a task. If the task's last timer session ended less than
   * JOIN_WINDOW_SECONDS ago, that session is reopened instead (accidental stop).
   */
  const startSession = useCallback(
    async (task: Task) => {
      const running = entriesRef.current.find((e) => e.ended_at === null);
      if (running?.task_id === task.id) return;

      const now = Date.now();
      await closeRunning(now);

      const last = entriesRef.current
        .filter((e) => e.task_id === task.id && e.ended_at && e.source === 'timer')
        .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

      const supabase = createClient();

      if (last && now - new Date(last.ended_at!).getTime() < JOIN_WINDOW_SECONDS * 1000) {
        commit((prev) =>
          prev.map((e) =>
            e.id === last.id ? { ...e, ended_at: null, duration_seconds: null } : e
          )
        );
        if (supabase) {
          await supabase
            .from('time_entries')
            .update({ ended_at: null, duration_seconds: null })
            .eq('id', last.id);
        }
        return;
      }

      const nowIso = new Date(now).toISOString();
      const session: TimeEntry = {
        id: newId(),
        task_id: task.id,
        project_id: task.project_id,
        description: task.title,
        started_at: nowIso,
        ended_at: null,
        duration_seconds: null,
        source: 'timer',
        created_at: nowIso,
      };
      commit((prev) => [session, ...prev]);
      if (supabase) {
        const { error } = await supabase.from('time_entries').insert([toRow(session)]);
        if (error) reportError('start', error);
      }
    },
    [commit, closeRunning]
  );

  /**
   * Stop the running session. With no custom end time, a session under
   * DISCARD_UNDER_SECONDS is deleted and returned as `discarded` so the caller can offer Undo.
   */
  const stopTimer = useCallback(
    async (customEndedAt?: Date): Promise<{ discarded: TimeEntry | null }> => {
      const running = entriesRef.current.find((e) => e.ended_at === null);
      if (!running) return { discarded: null };

      const startMs = new Date(running.started_at).getTime();
      const endMs = customEndedAt ? customEndedAt.getTime() : Date.now();
      const supabase = createClient();

      if (!customEndedAt && endMs - startMs < DISCARD_UNDER_SECONDS * 1000) {
        commit((prev) => prev.filter((e) => e.id !== running.id));
        if (supabase) {
          await supabase.from('time_entries').delete().eq('id', running.id);
        }
        return { discarded: running };
      }

      const safeEndMs = Math.max(startMs + 1000, endMs);
      const updates = {
        ended_at: new Date(safeEndMs).toISOString(),
        duration_seconds: Math.max(1, Math.floor((safeEndMs - startMs) / 1000)),
        source: (customEndedAt ? 'adjusted' : running.source) as EntrySource,
      };
      commit((prev) => prev.map((e) => (e.id === running.id ? { ...e, ...updates } : e)));
      if (supabase) {
        const { error } = await supabase
          .from('time_entries')
          .update(updates)
          .eq('id', running.id);
        if (error) reportError('stop', error);
      }
      return { discarded: null };
    },
    [commit]
  );

  /** Add a completed session to a task (manual log or gap fill) */
  const addSession = useCallback(
    async (
      task: Task,
      data: { startedAt: string; endedAt: string; durationSeconds: number; source?: EntrySource }
    ) => {
      const session: TimeEntry = {
        id: newId(),
        task_id: task.id,
        project_id: task.project_id,
        description: task.title,
        started_at: data.startedAt,
        ended_at: data.endedAt,
        duration_seconds: data.durationSeconds,
        source: data.source ?? 'manual',
        created_at: new Date().toISOString(),
      };
      commit((prev) => [session, ...prev]);
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('time_entries').insert([toRow(session)]);
        if (error) reportError('start', error);
      }
    },
    [commit]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<TimeEntry>) => {
      commit((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('time_entries').update(updates).eq('id', id);
        if (error) reportError('update', error);
      }
    },
    [commit, reportError]
  );

  /** Delete a session (returns it so the caller can offer Undo) */
  const deleteEntry = useCallback(
    async (id: string): Promise<TimeEntry | null> => {
      const target = entriesRef.current.find((e) => e.id === id) || null;
      commit((prev) => prev.filter((e) => e.id !== id));
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from('time_entries').delete().eq('id', id);
        if (error) reportError('delete', error);
      }
      return target;
    },
    [commit, reportError]
  );

  const restoreEntry = useCallback(
    async (entry: TimeEntry) => {
      commit((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').insert([toRow(entry)]);
      }
    },
    [commit]
  );

  /** Split one session into two consecutive sessions of the same task */
  const splitEntry = useCallback(
    async (entry: TimeEntry, firstDurationSeconds: number) => {
      const total = entry.duration_seconds || 0;
      if (firstDurationSeconds <= 0 || firstDurationSeconds >= total) return;

      const startMs = new Date(entry.started_at).getTime();
      const splitIso = new Date(startMs + firstDurationSeconds * 1000).toISOString();
      const endIso = entry.ended_at || new Date(startMs + total * 1000).toISOString();

      const second: TimeEntry = {
        ...entry,
        id: newId(),
        started_at: splitIso,
        ended_at: endIso,
        duration_seconds: total - firstDurationSeconds,
        source: 'adjusted',
        created_at: new Date().toISOString(),
      };
      const firstUpdates: Partial<TimeEntry> = {
        ended_at: splitIso,
        duration_seconds: firstDurationSeconds,
        source: 'adjusted',
      };

      commit((prev) => [
        second,
        ...prev.map((e) => (e.id === entry.id ? { ...e, ...firstUpdates } : e)),
      ]);
      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').update(firstUpdates).eq('id', entry.id);
        await supabase.from('time_entries').insert([toRow(second)]);
      }
    },
    [commit]
  );

  /** Reassign sessions to another task (Move session / Combine tasks) */
  const moveEntriesToTask = useCallback(
    async (entryIds: string[], task: Task) => {
      if (entryIds.length === 0) return;
      const ids = new Set(entryIds);
      const updates = {
        task_id: task.id,
        project_id: task.project_id,
        description: task.title,
      };
      commit((prev) => prev.map((e) => (ids.has(e.id) ? { ...e, ...updates } : e)));
      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').update(updates).in('id', entryIds);
      }
    },
    [commit]
  );

  /** Keep the sessions' mirrored title/project in step with their task */
  const syncTaskFields = useCallback(
    async (taskId: string, fields: { description?: string; project_id?: string | null }) => {
      commit((prev) => prev.map((e) => (e.task_id === taskId ? { ...e, ...fields } : e)));
      const supabase = createClient();
      if (supabase) {
        await supabase.from('time_entries').update(fields).eq('task_id', taskId);
      }
    },
    [commit]
  );

  /** Drop a task's sessions locally (the database removes them by cascade) */
  const forgetTaskEntries = useCallback(
    (taskId: string): TimeEntry[] => {
      const removed = entriesRef.current.filter((e) => e.task_id === taskId);
      commit((prev) => prev.filter((e) => e.task_id !== taskId));
      return removed;
    },
    [commit]
  );

  const sessionsForTask = useCallback(
    (taskId: string) => entriesRef.current.filter((e) => e.task_id === taskId),
    []
  );

  return {
    entries: completedEntries,
    allEntries: entries,
    runningEntry,
    elapsedSeconds,
    isRunning: !!runningEntry,
    isLoading,
    isCloudConnected,
    syncError,
    clearSyncError: () => setSyncError(null),
    startSession,
    stopTimer,
    addSession,
    updateEntry,
    deleteEntry,
    restoreEntry,
    splitEntry,
    moveEntriesToTask,
    syncTaskFields,
    forgetTaskEntries,
    sessionsForTask,
    refreshEntries: loadEntries,
  };
}
