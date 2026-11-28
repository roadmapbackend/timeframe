'use client';

import React from 'react';
import { TimeEntry } from '@/types';

export interface StripWindow {
  startMs: number;
  endMs: number;
}

interface DayStripProps {
  sessions: TimeEntry[];
  window: StripWindow;
  color?: string | null;
  nowMs: number;
}

/* Thin bar showing when in the day each session happened. */
export function DayStrip({ sessions, window, color, nowMs }: DayStripProps) {
  const span = Math.max(1, window.endMs - window.startMs);

  return (
    <div className="relative h-1.5 md:h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
      {sessions.map((s) => {
        const start = new Date(s.started_at).getTime();
        const end = s.ended_at ? new Date(s.ended_at).getTime() : nowMs;
        const left = ((start - window.startMs) / span) * 100;
        const width = ((end - start) / span) * 100;
        return (
          <span
            key={s.id}
            className={`absolute inset-y-0 rounded-full border-r border-background ${s.ended_at ? '' : 'animate-pulse'}`}
            style={{
              left: `${Math.max(0, Math.min(100, left))}%`,
              width: `${Math.max(1.2, Math.min(100, width))}%`,
              backgroundColor: s.ended_at ? color || 'var(--muted-foreground)' : 'var(--saffron)',
              opacity: 1,
            }}
          />
        );
      })}
    </div>
  );
}

/** A window covering at least 08:00–20:00 of the day, widened to fit every session */
export function stripWindowForDay(dayKey: string, sessions: TimeEntry[], nowMs: number): StripWindow {
  const [y, m, d] = dayKey.split('-').map(Number);
  let startMs = new Date(y, m - 1, d, 8).getTime();
  let endMs = new Date(y, m - 1, d, 20).getTime();
  sessions.forEach((s) => {
    const a = new Date(s.started_at).getTime();
    const b = s.ended_at ? new Date(s.ended_at).getTime() : nowMs;
    startMs = Math.min(startMs, a);
    endMs = Math.max(endMs, b);
  });
  return { startMs, endMs };
}
