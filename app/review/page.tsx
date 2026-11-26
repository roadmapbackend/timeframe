'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatReadableDuration, getLocalDayKey } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ArrowLeft,
} from 'lucide-react';

export default function WeeklyReviewPage() {
  const { entries, isCloudConnected } = useTimeEntries();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const [offset, setOffset] = useState(0);
  const [notes, setNotes] = useState('');

  const summary = useAnalytics(entries, 'week', offset, projects, tasks);
  const weekKey = getLocalDayKey(summary.bounds.start.toISOString());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNotes(localStorage.getItem(`timeframe_review_notes_${weekKey}`) || '');
  }, [weekKey]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`timeframe_review_notes_${weekKey}`, val);
    }
  };

  // Untracked weekdays (Mon-Fri) in this week
  const untrackedWeekdays = useMemo(() => {
    const dayTotals = new Map<string, number>();
    summary.dailyStacked.forEach((d) => dayTotals.set(d.dayKey, d.totalSeconds));

    const missing: string[] = [];
    const cursor = new Date(summary.bounds.start);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (let i = 0; i < 5; i++) {
      if (cursor > todayEnd) break;
      const dk = getLocalDayKey(cursor.toISOString());
      if (!dayTotals.get(dk)) {
        missing.push(
          cursor.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return missing;
  }, [summary.dailyStacked, summary.bounds.start]);

  // Biggest overruns (tasks where actual > estimate)
  const overruns = useMemo(() => {
    const list: { title: string; actual: number; estimate: number; diff: number }[] = [];
    summary.projectBreakdown.forEach((p) => {
      p.tasks.forEach((t) => {
        if (t.estimateSeconds && t.seconds > t.estimateSeconds) {
          list.push({
            title: t.title,
            actual: t.seconds,
            estimate: t.estimateSeconds,
            diff: t.seconds - t.estimateSeconds,
          });
        }
      });
    });
    return list.sort((a, b) => b.diff - a.diff);
  }, [summary.projectBreakdown]);

  // Export CSV for this week
  const handleExportCsv = () => {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const weekEntries = entries.filter((e) => {
      if (!e.ended_at || !e.duration_seconds) return false;
      const t = new Date(e.started_at).getTime();
      return (
        t >= summary.bounds.start.getTime() && t <= summary.bounds.end.getTime()
      );
    });

    const rows = [
      ['Date', 'Start', 'End', 'Duration (min)', 'Project', 'Description', 'Source'],
      ...weekEntries.map((e) => [
        getLocalDayKey(e.started_at),
        new Date(e.started_at).toISOString(),
        e.ended_at ? new Date(e.ended_at).toISOString() : '',
        String(Math.round((e.duration_seconds || 0) / 60)),
        e.project_id ? projectMap.get(e.project_id) || '' : '',
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.source,
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeframe-week-${weekKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isCloudConnected={isCloudConnected} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Weekly Review" />

        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-center md:hidden no-print">
            <Link
              href="/"
              className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ledger</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setOffset((o) => o - 1)}
                className="no-print p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Weekly Review · {summary.periodLabel}
                </h1>
                <p className="text-xs text-zinc-500 font-mono">
                  {summary.totalHours}h total · {summary.activeDays} active days ·{' '}
                  {summary.focusBlocksCount} focus blocks (90m+)
                </p>
              </div>
              <button
                onClick={() => setOffset((o) => Math.min(0, o + 1))}
                disabled={offset >= 0}
                className="no-print p-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="no-print flex items-center space-x-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Top Projects */}
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-[#191919] space-y-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Top Projects
            </h2>
            {summary.projectBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400">No time logged this week.</p>
            ) : (
              <div className="space-y-1.5">
                {summary.projectBreakdown.slice(0, 5).map((p) => (
                  <div
                    key={p.projectId || 'untagged'}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {p.name}
                      </span>
                    </span>
                    <span className="font-mono text-zinc-500">
                      {p.hours}h ({p.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Biggest Overruns & Untracked Weekdays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <section className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-[#191919] space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Estimate Overruns
              </h2>
              {overruns.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  No task estimate overruns recorded.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {overruns.slice(0, 4).map((o) => (
                    <div
                      key={o.title}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate pr-2 text-zinc-700 dark:text-zinc-300">
                        {o.title}
                      </span>
                      <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
                        {formatReadableDuration(o.actual)} /{' '}
                        {formatReadableDuration(o.estimate)} est
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-[#191919] space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Untracked Weekdays
              </h2>
              {untrackedWeekdays.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  All weekdays so far have logged entries.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {untrackedWeekdays.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded text-[11px] font-mono border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Reflection Notes */}
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-[#191919] space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Weekly Notes
            </h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="What moved the needle this week? What needs adjusting next week?"
              className="w-full text-xs bg-transparent focus:outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-y"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
