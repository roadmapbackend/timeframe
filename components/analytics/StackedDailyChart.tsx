'use client';

import React, { useMemo } from 'react';
import { DailyStackedDay } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';

interface StackedDailyChartProps {
  days: DailyStackedDay[];
}

/* Single stacked-by-project daily bar chart for week and month views. */
export function StackedDailyChart({ days }: StackedDailyChartProps) {
  const legend = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    days.forEach((d) => {
      d.segments.forEach((s) => {
        const key = s.projectId || '__untagged__';
        if (!map.has(key)) map.set(key, { name: s.name, color: s.color });
      });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [days]);

  if (days.length === 0) return null;

  const maxSeconds = Math.max(3600, ...days.map((d) => d.totalSeconds));

  return (
    <div className="border-t border-foreground/15 pt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ( Daily hours by project )
        </span>

        <div className="flex flex-wrap items-center gap-4">
          {legend.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span>{item.name}</span>
            </span>
          ))}
          <span className="font-mono text-[11px] text-muted-foreground">
            max {(maxSeconds / 3600).toFixed(1)}h
          </span>
        </div>
      </div>

      <div className="h-40 flex items-end gap-1.5 pt-2">
        {days.map((day) => {
          const totalPct = Math.round((day.totalSeconds / maxSeconds) * 100);
          const tooltipText =
            day.totalSeconds === 0
              ? `${day.label}: 0m`
              : `${day.label}: ${formatReadableDuration(day.totalSeconds)} (${day.segments
                  .map((s) => `${s.name} ${formatReadableDuration(s.seconds)}`)
                  .join(', ')})`;

          return (
            <div
              key={day.dayKey}
              className="flex-1 flex flex-col items-center h-full justify-end"
              title={tooltipText}
            >
              <div
                className="w-full max-w-[32px] rounded-t-xs overflow-hidden flex flex-col-reverse gap-[1px] transition-all"
                style={{
                  height: day.totalSeconds > 0 ? `${Math.max(4, totalPct)}%` : '2px',
                  backgroundColor:
                    day.totalSeconds === 0
                      ? 'color-mix(in oklab, var(--foreground) 16%, transparent)'
                      : undefined,
                }}
              >
                {day.segments.map((seg, i) => {
                  const segPct =
                    day.totalSeconds > 0
                      ? (seg.seconds / day.totalSeconds) * 100
                      : 0;
                  return (
                    <div
                      key={`${day.dayKey}-${seg.projectId || i}`}
                      style={{
                        height: `${segPct}%`,
                        backgroundColor: seg.color,
                      }}
                      className="w-full"
                    />
                  );
                })}
              </div>

              <span className="font-mono text-[10px] text-muted-foreground mt-2 truncate max-w-full">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
