'use client';

import React from 'react';
import { DailyStackedDay } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';

interface StackedDailyChartProps {
  days: DailyStackedDay[];
}

export function StackedDailyChart({ days }: StackedDailyChartProps) {
  if (days.length === 0) return null;

  const maxSeconds = Math.max(
    3600,
    ...days.map((d) => d.totalSeconds)
  );

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Daily Hours by Project
        </h3>
        <span className="text-[10px] font-mono text-zinc-400">
          max {(maxSeconds / 3600).toFixed(1)}h
        </span>
      </div>

      <div className="h-36 flex items-end gap-1.5 pt-2">
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
              className="flex-1 flex flex-col items-center h-full justify-end group"
              title={tooltipText}
            >
              <div
                className="w-full max-w-[32px] rounded-t-xs overflow-hidden flex flex-col-reverse transition-all"
                style={{
                  height: day.totalSeconds > 0 ? `${Math.max(4, totalPct)}%` : '2px',
                  backgroundColor:
                    day.totalSeconds === 0 ? 'rgba(161,161,170,0.2)' : undefined,
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

              <span className="text-[10px] font-mono text-zinc-400 mt-1.5 truncate max-w-full">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
