'use client';

import React, { useState } from 'react';
import { EditorialNav } from '@/components/layout/EditorialNav';
import { SummaryCards } from '@/components/analytics/SummaryCards';
import { ProjectTaskBreakdown } from '@/components/analytics/ProjectTaskBreakdown';
import { StackedDailyChart } from '@/components/analytics/StackedDailyChart';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TimePeriod } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AnalyticsPage() {
  const { entries, runningEntry, elapsedSeconds, isCloudConnected, stopTimer } =
    useTimeEntries();
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
    <div className="min-h-screen flex flex-col">
      <EditorialNav
        isCloudConnected={isCloudConnected}
        runningLabel={runningEntry?.description || null}
        elapsedSeconds={elapsedSeconds}
        onStopTimer={() => stopTimer()}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 sm:px-10 py-10 sm:py-16 space-y-12">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOffset((o) => o - 1)}
                aria-label="Previous period"
                className="p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <h1 className="font-display text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.03em] font-medium text-foreground">
                {summary.periodLabel}
              </h1>
              <button
                type="button"
                onClick={() => setOffset((o) => Math.min(0, o + 1))}
                disabled={offset >= 0}
                aria-label="Next period"
                className="p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="font-mono text-xs md:text-sm text-muted-foreground">
              {summary.totalHours}h logged · {deltaSign}
              {deltaRounded}h vs previous {period}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card self-start sm:self-auto">
            {periods.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setPeriod(p.value);
                  setOffset(0);
                }}
                className={`px-3.5 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm transition-colors cursor-pointer ${
                  period === p.value
                    ? 'bg-saffron text-saffron-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <SummaryCards summary={summary} period={period} />

        <ProjectTaskBreakdown items={summary.projectBreakdown} />

        {(period === 'week' || period === 'month') && (
          <StackedDailyChart days={summary.dailyStacked} />
        )}
      </main>
    </div>
  );
}
