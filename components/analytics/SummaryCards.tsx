'use client';

import React from 'react';
import { AnalyticsSummary, TimePeriod } from '@/types';
import { Clock, TrendingUp, CheckCircle2 } from 'lucide-react';

interface SummaryCardsProps {
  summary: AnalyticsSummary;
  period: TimePeriod;
}

export function SummaryCards({ summary, period }: SummaryCardsProps) {
  // Compute daily average for the period
  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  const avgHoursPerDay = (parseFloat(summary.totalHours) / daysInPeriod).toFixed(1);
  const topTask = summary.taskBreakdown[0]?.description || 'None';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Total Hours */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Total Logged Time</span>
          <Clock className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {summary.totalHours}
          </span>
          <span className="text-xs text-zinc-500 font-mono">hrs</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          Across {summary.entryCount} recorded sessions
        </p>
      </div>

      {/* Daily Average */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Daily Pace</span>
          <TrendingUp className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {avgHoursPerDay}
          </span>
          <span className="text-xs text-zinc-500 font-mono">hrs/day</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          Normalized for active {period} window
        </p>
      </div>

      {/* Top Priority / Time sink */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-3.5">
        <div className="flex items-center justify-between text-zinc-400 text-xs">
          <span className="font-medium">Primary Focus</span>
          <CheckCircle2 className="w-4 h-4 stroke-[1.75]" />
        </div>
        <div className="mt-2 truncate">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
            {topTask}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          {summary.taskBreakdown[0]
            ? `${summary.taskBreakdown[0].hours} hrs (${summary.taskBreakdown[0].percentage}% of total)`
            : 'No activity recorded yet'}
        </p>
      </div>
    </div>
  );
}
