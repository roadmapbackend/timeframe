'use client';

import React from 'react';
import { DailyStackedDay } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';

interface StackedDailyChartProps {
  days: DailyStackedDay[];
}

/* Single stacked-by-project daily bar chart for week and month views. */
export function StackedDailyChart({ days }: StackedDailyChartProps) {
  if (days.length === 0) return null;

  const maxSeconds = Math.max(3600, ...days.map((d) => d.totalSeconds));

  return (
    <div className="border-t border-foreground/15 pt-8 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ( Daily hours by project )
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          max {(maxSeconds / 3600).toFixed(1)}h
        </span>
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
                className="w-full max-w-[32px] rounded-t-xs overflow-hidden flex flex-col-reverse transition-all"
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
