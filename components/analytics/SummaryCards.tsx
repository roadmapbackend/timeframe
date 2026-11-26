'use client';

import React from 'react';
import { AnalyticsSummary, TimePeriod } from '@/types';
import { Clock, TrendingUp, Focus } from 'lucide-react';

interface SummaryCardsProps {
  summary: AnalyticsSummary;
  period: TimePeriod;
}

export function SummaryCards({ summary, period }: SummaryCardsProps) {
  const avgOverActiveDays =
    summary.activeDays > 0
      ? (summary.totalSeconds / 3600 / summary.activeDays).toFixed(1)
      : '0.0';

  const totalSourceSeconds = summary.timerSeconds + summary.manualSeconds;
  const manualPct =
    totalSourceSeconds > 0
      ? Math.round((summary.manualSeconds / totalSourceSeconds) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Total Logged</span>
          <Clock className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {summary.totalHours}
          </span>
          <span className="text-xs text-zinc-500 font-mono">hrs</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {summary.entryCount} entries · {manualPct}% manual
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Daily Average</span>
          <TrendingUp className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {avgOverActiveDays}
          </span>
          <span className="text-xs text-zinc-500 font-mono">hrs/day</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {summary.activeDays > 0
            ? `avg over ${summary.activeDays} active ${
                summary.activeDays === 1 ? 'day' : 'days'
              }`
            : `no active days in this ${period}`}
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Focus Blocks (90m+)</span>
          <Focus className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {summary.focusBlocksCount}
          </span>
          <span className="text-xs text-zinc-500 font-mono">sessions</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {summary.taskBreakdown[0]
            ? `Top: ${summary.taskBreakdown[0].description}`
            : 'No deep work sessions yet'}
        </p>
      </div>
    </div>
  );
}
