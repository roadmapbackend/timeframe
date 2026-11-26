'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { SummaryCards } from '@/components/analytics/SummaryCards';
import { ProjectTaskBreakdown } from '@/components/analytics/ProjectTaskBreakdown';
import { StackedDailyChart } from '@/components/analytics/StackedDailyChart';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TimePeriod } from '@/types';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

export default function AnalyticsPage() {
  const { entries, isCloudConnected } = useTimeEntries();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [offset, setOffset] = useState<number>(0);

  const summary = useAnalytics(entries, period, offset, projects, tasks);

  const periods: { label: string; value: TimePeriod }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ];

  const deltaRounded = summary.deltaHours.toFixed(1);
  const deltaSign = summary.deltaHours >= 0 ? '+' : '';

  return (
    <div className="flex min-h-screen">
      <Sidebar isCloudConnected={isCloudConnected} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Analytics" />

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-center md:hidden">
            <Link
              href="/"
              className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ledger</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setOffset((o) => o - 1)}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="Previous period"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <h1 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {summary.periodLabel}
                </h1>
                <button
                  onClick={() => setOffset((o) => Math.min(0, o + 1))}
                  disabled={offset >= 0}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
                  title="Next period"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                {summary.totalHours}h logged · {deltaSign}
                {deltaRounded}h vs previous {period}
              </p>
            </div>

            <div className="inline-flex items-center p-0.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-100/70 dark:bg-zinc-800/50 self-start sm:self-auto">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPeriod(p.value);
                    setOffset(0);
                  }}
                  className={`px-3 py-1 text-xs rounded transition-all ${
                    period === p.value
                      ? 'bg-white dark:bg-[#191919] font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <SummaryCards summary={summary} period={period} />

          {/* Breakdown table first */}
          <ProjectTaskBreakdown items={summary.projectBreakdown} />

          {/* One stacked bar chart per day for week and month views */}
          {(period === 'week' || period === 'month') && (
            <StackedDailyChart days={summary.dailyStacked} />
          )}
        </main>
      </div>
    </div>
  );
}
