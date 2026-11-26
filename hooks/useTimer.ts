'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEY_TIMER } from '@/lib/constants';

export interface ActiveTimerState {
  description: string;
  projectId: string | null;
  startedAt: string; // ISO string
}

export function useTimer() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY_TIMER);
    if (saved) {
      try {
        const parsed: ActiveTimerState = JSON.parse(saved);
        setActiveTimer(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY_TIMER);
      }
    }
  }, []);

  // Update elapsed seconds accurately using real clock delta
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startTimestamp = new Date(activeTimer.startedAt).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTimestamp) / 1000));
      setElapsedSeconds(diff);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer]);

  const start = useCallback((description: string, projectId: string | null = null) => {
    const newState: ActiveTimerState = {
      description,
      projectId,
      startedAt: new Date().toISOString(),
    };
    setActiveTimer(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TIMER, JSON.stringify(newState));
    }
  }, []);

  const stop = useCallback(() => {
    if (!activeTimer) return null;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      Math.floor((new Date(endedAt).getTime() - new Date(activeTimer.startedAt).getTime()) / 1000)
    );

    const completed = {
      description: activeTimer.description,
      projectId: activeTimer.projectId,
      startedAt: activeTimer.startedAt,
      endedAt,
      durationSeconds,
      isManual: false,
    };

    setActiveTimer(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    }
    return completed;
  }, [activeTimer]);

  const discard = useCallback(() => {
    setActiveTimer(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TIMER);
    }
  }, []);

  return {
    activeTimer,
    elapsedSeconds,
    isRunning: !!activeTimer,
    start,
    stop,
    discard,
  };
}
