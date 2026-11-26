'use client';

import { useMemo } from 'react';
import { TimeEntry, TimePeriod, AnalyticsSummary } from '@/types';
import { getLocalDayKey } from '@/lib/utils';

export function getPeriodBounds(period: TimePeriod, offset = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'day') {
    start.setDate(now.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    const label =
      offset === 0
        ? 'Today'
        : offset === -1
        ? 'Yesterday'
        : start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return { start, end, label };
  }

  if (period === 'week') {
    // Monday-start calendar week
    const dayOfWeek = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - dayOfWeek + offset * 7);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const label = offset === 0 ? `This week (${fmt(start)} – ${fmt(end)})` : `${fmt(start)} – ${fmt(end)}`;
    return { start, end, label };
  }

  // Month
  start.setFullYear(now.getFullYear(), now.getMonth() + offset, 1);
  start.setHours(0, 0, 0, 0);
  end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  const label = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function summarize(entries: TimeEntry[], start: Date, end: Date): AnalyticsSummary {
  const filtered = entries.filter((e) => {
    if (!e.ended_at || !e.duration_seconds) return false;
    const t = new Date(e.started_at).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const totalSeconds = filtered.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const activeDayKeys = new Set(filtered.map((e) => getLocalDayKey(e.started_at)));
  const activeDays = activeDayKeys.size;

  const focusBlocksCount = filtered.filter((e) => (e.duration_seconds || 0) >= 5400).length;

  let timerSeconds = 0;
  let manualSeconds = 0;

  const taskMap: Record<string, { seconds: number; projectId: string | null }> = {};
  filtered.forEach((e) => {
    const dur = e.duration_seconds || 0;
    if (e.source === 'timer') timerSeconds += dur;
    else manualSeconds += dur;

    const desc = e.description?.trim() || 'Untitled Task';
    if (!taskMap[desc]) {
      taskMap[desc] = { seconds: 0, projectId: e.project_id };
    }
    taskMap[desc].seconds += dur;
  });

  const taskBreakdown = Object.entries(taskMap)
    .map(([description, info]) => ({
      description,
      projectId: info.projectId,
      seconds: info.seconds,
      hours: (info.seconds / 3600).toFixed(1),
      percentage: totalSeconds > 0 ? Math.round((info.seconds / totalSeconds) * 100) : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds,
    totalHours,
    entryCount: filtered.length,
    activeDays,
    focusBlocksCount,
    timerSeconds,
    manualSeconds,
    taskBreakdown,
  };
}

export function useAnalytics(entries: TimeEntry[], period: TimePeriod, offset = 0) {
  return useMemo(() => {
    const currentBounds = getPeriodBounds(period, offset);
    const prevBounds = getPeriodBounds(period, offset - 1);

    const current = summarize(entries, currentBounds.start, currentBounds.end);
    const previous = summarize(entries, prevBounds.start, prevBounds.end);

    const deltaHours = (current.totalSeconds - previous.totalSeconds) / 3600;

    return {
      ...current,
      periodLabel: currentBounds.label,
      bounds: currentBounds,
      deltaHours,
      previousTotalHours: previous.totalHours,
    };
  }, [entries, period, offset]);
}
