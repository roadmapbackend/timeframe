'use client';

import { useMemo } from 'react';
import { TimeEntry, TimePeriod, AnalyticsSummary } from '@/types';

export function useAnalytics(entries: TimeEntry[], period: TimePeriod): AnalyticsSummary {
  return useMemo(() => {
    const now = new Date();
    
    // Filter entries based on period
    const filtered = entries.filter((e) => {
      const entryDate = new Date(e.started_at);
      if (period === 'day') {
        return entryDate.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return entryDate >= weekAgo;
      }
      if (period === 'month') {
        return (
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });

    const totalSeconds = filtered.reduce((acc, curr) => acc + curr.duration_seconds, 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    // Group by task description
    const taskMap: Record<string, number> = {};
    filtered.forEach((e) => {
      const desc = e.description?.trim() || 'Untitled Task';
      taskMap[desc] = (taskMap[desc] || 0) + e.duration_seconds;
    });

    const taskBreakdown = Object.entries(taskMap)
      .map(([description, seconds]) => {
        const hours = (seconds / 3600).toFixed(1);
        const percentage = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
        return {
          description,
          seconds,
          hours,
          percentage,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    return {
      totalSeconds,
      totalHours,
      entryCount: filtered.length,
      taskBreakdown,
    };
  }, [entries, period]);
}
