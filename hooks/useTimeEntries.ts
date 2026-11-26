'use client';

import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_KEY_ENTRIES } from '@/lib/constants';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Load initial data
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
          // Sync backup locally
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

    // Fallback to local storage
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

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Add entry (handles both manual & timer stops)
  const addEntry = useCallback(
    async (entryData: {
      description: string;
      projectId?: string | null;
      startedAt: string;
      endedAt: string;
      durationSeconds: number;
      isManual: boolean;
    }) => {
      const newEntry: TimeEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `entry-${Date.now()}`,
        description: entryData.description || 'Untitled Task',
        project_id: entryData.projectId || null,
        started_at: entryData.startedAt,
        ended_at: entryData.endedAt,
        duration_seconds: entryData.durationSeconds,
        is_manual: entryData.isManual,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setEntries((prev) => [newEntry, ...prev]);

      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase.from('time_entries').insert([
            {
              id: newEntry.id,
              description: newEntry.description,
              project_id: newEntry.project_id,
              started_at: newEntry.started_at,
              ended_at: newEntry.ended_at,
              duration_seconds: newEntry.duration_seconds,
              is_manual: newEntry.is_manual,
            },
          ]);
          if (!error) return;
        } catch (e) {
          console.warn('Failed cloud sync, stored locally', e);
        }
      }

      // Local storage persistence
      if (typeof window !== 'undefined') {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY_ENTRIES) || '[]');
        localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([newEntry, ...current]));
      }
    },
    []
  );

  // Update entry
  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('time_entries').update(updates).eq('id', id);
      } catch (e) {
        console.warn('Update failed', e);
      }
    }

    if (typeof window !== 'undefined') {
      const current: TimeEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ENTRIES) || '[]');
      const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));
    }
  }, []);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('time_entries').delete().eq('id', id);
      } catch (e) {
        console.warn('Delete failed', e);
      }
    }

    if (typeof window !== 'undefined') {
      const current: TimeEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ENTRIES) || '[]');
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));
    }
  }, []);

  return {
    entries,
    isLoading,
    isCloudConnected,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: loadEntries,
  };
}
