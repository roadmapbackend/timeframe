'use client';

import React, { useMemo } from 'react';
import { DailyStackedDay } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';
import { STUDIO_PALETTE } from '@/lib/constants';

interface StackedDailyChartProps {
  days: DailyStackedDay[];
}

/* Stacked-by-project daily bar chart in a card with studio palette colors. */
export function StackedDailyChart({ days }: StackedDailyChartProps) {
  const { legend, colorFor } = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    let fallbackIdx = 0;

    days.forEach((d) => {
      d.segments.forEach((s) => {
        const key = s.projectId || '__untagged__';
        if (!map.has(key)) {
          const isMuted = !s.color || s.color === '#a1a1aa' || s.color === '#787774';
          const resolvedColor = isMuted
            ? STUDIO_PALETTE[fallbackIdx % STUDIO_PALETTE.length].hex
            : s.color;
          fallbackIdx += 1;
          map.set(key, { name: s.name, color: resolvedColor });
        }
      });
    });

    return {
      legend: Array.from(map.entries()).map(([key, val]) => ({ key, ...val })),
      colorFor: (projectId: string | null) =>
        map.get(projectId || '__untagged__')?.color || STUDIO_PALETTE[0].hex,
    };
  }, [days]);

  if (days.length === 0) return null;

  const maxSeconds = Math.max(3600, ...days.map((d) => d.totalSeconds));

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Daily hours by project
        </span>

        <div className="flex flex-wrap items-center gap-4">
          {legend.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 text-xs md:text-sm text-foreground/85"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span>{item.name}</span>
            </span>
          ))}
          <span className="font-mono text-[11px] md:text-xs text-muted-foreground">
            max {(maxSeconds / 3600).toFixed(1)}h
          </span>
        </div>
      </div>

      <div className="h-44 md:h-56 flex items-end gap-2 pt-2">
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
                className="w-full max-w-[36px] rounded-t-md overflow-hidden flex flex-col-reverse gap-[2px] transition-all"
                style={{
                  height: day.totalSeconds > 0 ? `${Math.max(4, totalPct)}%` : '3px',
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
                        backgroundColor: colorFor(seg.projectId),
                      }}
                      className="w-full"
                    />
                  );
                })}
              </div>

              <span className="font-mono text-[11px] md:text-xs text-muted-foreground mt-2 truncate max-w-full">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
