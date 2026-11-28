'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Play } from 'lucide-react';
import { Project, Task } from '@/types';
import { formatDayLabel, formatReadableDuration } from '@/lib/utils';

interface CalendarHistoryProps {
  today: string;
  tasksByDay: Map<string, Task[]>;
  projectMap: Map<string, Project>;
  taskSeconds: (taskId: string) => number;
  onOpenTask: (taskId: string) => void;
  onResumeTask: (task: Task) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* Compact expandable month calendar for browsing and resuming past days without crowding /. */
export function CalendarHistory({
  today,
  tasksByDay,
  projectMap,
  taskSeconds,
  onOpenTask,
  onResumeTask,
}: CalendarHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = useMemo(() => (today ? new Date(`${today}T12:00:00`) : new Date()), [today]);
  const [viewYear, setViewYear] = useState(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const past = Array.from(tasksByDay.keys())
      .filter((d) => today && d < today)
      .sort()
      .reverse();
    return past[0] || today || toDayKey(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate());
  });

  const pastDayCount = useMemo(
    () => Array.from(tasksByDay.keys()).filter((d) => today && d < today).length,
    [tasksByDay, today]
  );

  // Build calendar cells for viewYear / viewMonth (Monday-first)
  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const result: Array<{ dayNum: number; dayKey: string } | null> = [];
    for (let i = 0; i < startOffset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ dayNum: d, dayKey: toDayKey(viewYear, viewMonth, d) });
    }
    return result;
  }, [viewYear, viewMonth]);

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectedTasks = tasksByDay.get(selectedDay) || [];
  const selectedTotal = selectedTasks.reduce((sum, t) => sum + taskSeconds(t.id), 0);

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Calendar className="w-4 h-4" aria-hidden="true" />
        <span>
          Calendar{pastDayCount > 0 ? ` · ${pastDayCount} past ${pastDayCount === 1 ? 'day' : 'days'}` : ''}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 grid grid-cols-1 md:grid-cols-12 gap-6 shadow-2xs">
          {/* Left: Compact month grid */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{monthTitle}</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  aria-label="Previous month"
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  aria-label="Next month"
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd) => (
                <span
                  key={wd}
                  className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground py-1"
                >
                  {wd}
                </span>
              ))}

              {cells.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} />;
                const dayTasks = tasksByDay.get(cell.dayKey) || [];
                const daySecs = dayTasks.reduce((s, t) => s + taskSeconds(t.id), 0);
                const isSelected = selectedDay === cell.dayKey;
                const isToday = today === cell.dayKey;
                const firstProjColor =
                  dayTasks.map((t) => (t.project_id ? projectMap.get(t.project_id)?.color : null)).find(Boolean) ||
                  'var(--saffron)';

                return (
                  <button
                    key={cell.dayKey}
                    type="button"
                    onClick={() => setSelectedDay(cell.dayKey)}
                    className={`relative h-9 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-saffron text-saffron-foreground font-semibold'
                        : isToday
                        ? 'border border-saffron/60 text-foreground hover:bg-muted'
                        : 'text-foreground/85 hover:bg-muted'
                    }`}
                  >
                    <span>{cell.dayNum}</span>
                    {daySecs > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{
                          backgroundColor: isSelected ? 'var(--saffron-foreground)' : firstProjColor,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected day's tasks */}
          <div className="md:col-span-7 md:border-l md:border-border md:pl-6 space-y-3">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h4 className="text-sm font-semibold text-foreground">
                {selectedDay ? formatDayLabel(selectedDay) : 'Select a day'}
              </h4>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {selectedTotal > 0 ? formatReadableDuration(selectedTotal) : '0m'}
              </span>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No time logged on this day.
              </p>
            ) : (
              <div className="divide-y divide-border/70 max-h-60 overflow-y-auto pr-1">
                {selectedTasks.map((task) => {
                  const proj = task.project_id ? projectMap.get(task.project_id) : null;
                  const secs = taskSeconds(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTask(task.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenTask(task.id)}
                      className="group flex items-center justify-between gap-3 py-2.5 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj?.color || 'var(--border)' }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {task.title}
                          </p>
                          {proj && (
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              {proj.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs tabular-nums text-foreground/85">
                          {formatReadableDuration(secs)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResumeTask(task);
                          }}
                          aria-label={`Resume ${task.title}`}
                          title="Resume today"
                          className="p-1.5 rounded-full bg-muted hover:bg-saffron hover:text-saffron-foreground text-foreground cursor-pointer transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current translate-x-[0.5px]" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
