'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { SummaryCards } from '@/components/analytics/SummaryCards';
import { MinimalBarChart } from '@/components/analytics/MinimalBarChart';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TimePeriod } from '@/types';

export default function AnalyticsPage() {
  const { entries, isCloudConnected } = useTimeEntries();
  const [period, setPeriod] = useState<TimePeriod>('week');
  const summary = useAnalytics(entries, period);

  const periods: { label: string; value: TimePeriod }[] = [
    { label: 'Today', value: 'day' },
    { label: 'Past 7 Days', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar isCloudConnected={isCloudConnected} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Analytics" />

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
          {/* Header & Period Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Performance & Analytics
              </h1>
              <p className="text-xs text-zinc-500">
                Time distribution and focus breakdown across active intervals.
              </p>
            </div>

            {/* Notion-style pill selector */}
            <div className="inline-flex items-center p-0.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-100/70 dark:bg-zinc-800/50 self-start sm:self-auto">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
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

          {/* Metric Summary Cards */}
          <SummaryCards summary={summary} period={period} />

          {/* Distribution Visualization */}
          <MinimalBarChart summary={summary} />
        </main>
      </div>
    </div>
  );
}
