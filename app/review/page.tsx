'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatReadableDuration, getLocalDayKey } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';

export default function WeeklyReviewPage() {
  const { entries, runningEntry, elapsedSeconds, isCloudConnected, stopTimer } =
    useTimeEntries();
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

  const billableSummary = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    let billableSeconds = 0;
    let totalAmount = 0;

    summary.projectBreakdown.forEach((item) => {
      if (!item.projectId) return;
      const proj = projectMap.get(item.projectId);
      if (proj?.is_billable) {
        billableSeconds += item.seconds;
        if (proj.hourly_rate) {
          totalAmount += (item.seconds / 3600) * Number(proj.hourly_rate);
        }
      }
    });

    return {
      hours: (billableSeconds / 3600).toFixed(1),
      amount: Math.round(totalAmount),
      hasBillable: billableSeconds > 0,
    };
  }, [projects, summary.projectBreakdown]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 sm:px-10 py-10 sm:py-16 space-y-12">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground block">
              ( Weekly review )
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOffset((o) => o - 1)}
                aria-label="Previous week"
                className="no-print p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 cursor-pointer"
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
                aria-label="Next week"
                className="no-print p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="font-mono text-xs text-muted-foreground">
              {summary.totalHours}h total · {summary.activeDays} active days ·{' '}
              {summary.focusBlocksCount} focus blocks (90m+)
              {billableSummary.hasBillable
                ? ` · ${billableSummary.hours}h billable`
                : ''}
            </p>
          </div>

          <div className="no-print flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs text-foreground hover:border-foreground/40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-saffron text-saffron-foreground text-xs font-medium hover:opacity-90 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print report</span>
            </button>
          </div>
        </header>

        {/* 01 Top Projects */}
        <section className="border-t border-foreground/15 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ( 01 ) Top projects
            </span>
          </div>
          <div className="lg:col-span-9">
            {summary.projectBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time logged this week.</p>
            ) : (
              <div className="divide-y divide-border">
                {summary.projectBreakdown.slice(0, 5).map((p) => (
                  <div
                    key={p.projectId || 'untagged'}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground">{p.name}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.hours}h ({p.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 02 Overruns & Untracked Weekdays */}
        <section className="border-t border-foreground/15 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ( 02 ) Gaps & overruns
            </span>
          </div>
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Estimate overruns
              </h2>
              {overruns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No task estimate overruns recorded.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {overruns.slice(0, 4).map((o) => (
                    <div
                      key={o.title}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="truncate pr-3 text-foreground">{o.title}</span>
                      <span className="font-mono text-xs text-saffron shrink-0">
                        {formatReadableDuration(o.actual)} /{' '}
                        {formatReadableDuration(o.estimate)} est
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Untracked weekdays
              </h2>
              {untrackedWeekdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All weekdays so far have logged entries.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {untrackedWeekdays.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-full text-xs font-mono border border-dashed border-foreground/25 text-muted-foreground"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 03 Reflection Notes */}
        <section className="border-t border-foreground/15 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ( 03 ) Weekly notes
            </span>
          </div>
          <div className="lg:col-span-9">
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="What moved the needle this week? What needs adjusting next week?"
              className="w-full text-sm leading-relaxed py-2 border-b border-foreground/20 focus:border-saffron bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/60 resize-y"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
