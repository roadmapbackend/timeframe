'use client';

import React from 'react';
import { AnalyticsSummary, TimePeriod } from '@/types';
import { formatReadableDuration } from '@/lib/utils';

interface SummaryCardsProps {
  summary: AnalyticsSummary;
  period: TimePeriod;
}

/* Hairline-separated editorial summary metrics. */
export function SummaryCards({ summary, period }: SummaryCardsProps) {
  const avgSecondsPerActiveDay =
    summary.activeDays > 0
      ? Math.round(summary.totalSeconds / summary.activeDays)
      : 0;

  const totalSourceSeconds = summary.timerSeconds + summary.manualSeconds;
  const manualPct =
    totalSourceSeconds > 0
      ? Math.round((summary.manualSeconds / totalSourceSeconds) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-y border-foreground/15 divide-y md:divide-y-0 md:divide-x divide-border">
      <div className="py-5 md:pr-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground block">
          Total logged
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-3xl sm:text-4xl font-medium tabular-nums text-foreground">
            {summary.totalSeconds > 0 ? formatReadableDuration(summary.totalSeconds) : '0m'}
          </span>
          {summary.totalSeconds >= 3600 && (
            <span className="font-mono text-xs text-muted-foreground">
              ({summary.totalHours}h)
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground mt-2">
          {summary.entryCount} entries · {manualPct}% manual
        </p>
      </div>

      <div className="py-5 md:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground block">
          Daily average
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-3xl sm:text-4xl font-medium tabular-nums text-foreground">
            {avgSecondsPerActiveDay > 0 ? formatReadableDuration(avgSecondsPerActiveDay) : '0m'}
          </span>
          <span className="font-mono text-xs text-muted-foreground">/ day</span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground mt-2">
          {summary.activeDays > 0
            ? `avg over ${summary.activeDays} active ${
                summary.activeDays === 1 ? 'day' : 'days'
              }`
            : `no active days in this ${period}`}
        </p>
      </div>

      <div className="py-5 md:pl-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground block">
          Focus blocks (90m+)
        </span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-3xl sm:text-4xl font-medium tabular-nums text-saffron">
            {summary.focusBlocksCount}
          </span>
          <span className="font-mono text-xs text-muted-foreground">sessions</span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground mt-2 truncate">
          {summary.taskBreakdown[0]
            ? `Top: ${summary.taskBreakdown[0].description}`
            : 'No deep work sessions yet'}
        </p>
      </div>
    </div>
  );
}
