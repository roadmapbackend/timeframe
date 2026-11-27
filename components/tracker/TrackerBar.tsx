'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Square, CornerDownLeft, AlertCircle, Clock } from 'lucide-react';
import {
  formatDayLabel,
  formatDuration,
  formatReadableDuration,
  normalizeTitle,
  parseQuickAddInput,
} from '@/lib/utils';
import { Project, Task, TaskPriority, TimeEntry } from '@/types';

interface TrackerBarProps {
  projects: Project[];
  tasks: Task[];
  runningEntry: TimeEntry | null;
  runningTask: Task | null;
  elapsedSeconds: number;
  onStartByTitle: (
    title: string,
    opts: { projectId?: string | null; priority?: TaskPriority }
  ) => Promise<unknown>;
  onResumeTask: (task: Task) => Promise<unknown>;
  onStopTimer: (customEndedAt?: Date) => Promise<void>;
  onQuickLog: (data: {
    title: string;
    projectId: string | null;
    priority?: TaskPriority;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }) => Promise<void>;
  onOpenManual: () => void;
  onOpenRunningTask?: () => void;
  onCreateProject: (name: string) => Promise<Project | null>;
}

const FORGOTTEN_THRESHOLD_SECONDS = 4 * 3600;

type Suggestion =
  | { kind: 'task'; task: Task; project: Project | null }
  | { kind: 'project'; project: Project };

/* Timer card: type to start or continue a task, or "1h45" to log finished work. */
export function TrackerBar({
  projects,
  tasks,
  runningEntry,
  runningTask,
  elapsedSeconds,
  onStartByTitle,
  onResumeTask,
  onStopTimer,
  onQuickLog,
  onOpenManual,
  onOpenRunningTask,
  onCreateProject,
}: TrackerBarProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isRunning = !!runningEntry;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const parsed = useMemo(() => parseQuickAddInput(input, projects), [input, projects]);

  // Latest card of each thread, most recent first
  const threads = useMemo(() => {
    const seen = new Set<string>();
    const list: Task[] = [];
    [...tasks]
      .sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at))
      .forEach((t) => {
        if (seen.has(t.thread_id)) return;
        seen.add(t.thread_id);
        list.push(t);
      });
    return list;
  }, [tasks]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (isRunning) return [];
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const hashMatch = input.match(/#([a-zA-Z0-9_-]*)$/);
    if (hashMatch) {
      const term = hashMatch[1].toLowerCase();
      return projects
        .filter((p) => !p.is_archived && p.name.toLowerCase().includes(term))
        .slice(0, 5)
        .map((p) => ({ kind: 'project' as const, project: p }));
    }
    if (parsed.durationSeconds) return [];
    const q = normalizeTitle(parsed.description);
    return threads
      .filter((t) => !q || normalizeTitle(t.title).includes(q))
      .slice(0, 5)
      .map((t) => ({
        kind: 'task' as const,
        task: t,
        project: t.project_id ? projectMap.get(t.project_id) || null : null,
      }));
  }, [input, isRunning, projects, threads, parsed]);

  useEffect(() => setActive(-1), [input]);

  const isQuickLog = !isRunning && parsed.durationSeconds !== null;
  const isForgotten = isRunning && elapsedSeconds >= FORGOTTEN_THRESHOLD_SECONDS;

  const pick = async (s: Suggestion) => {
    if (s.kind === 'project') {
      setInput((prev) => prev.replace(/#[a-zA-Z0-9_-]*$/, `#${s.project.name} `));
      return;
    }
    setOpen(false);
    setInput('');
    await onResumeTask(s.task);
  };

  const handleSubmit = async () => {
    setOpen(false);
    if (isRunning) {
      await onStopTimer();
      return;
    }

    // Only pass a priority when typed (!high), so a continued task keeps its own
    const priority = /!(low|medium|high)\b/i.test(input) ? parsed.priority : undefined;
    let projectId = parsed.projectId;
    if (!projectId && parsed.projectName) {
      const created = await onCreateProject(parsed.projectName);
      if (created) projectId = created.id;
    }

    if (parsed.durationSeconds) {
      const endedAt = parsed.endedAt;
      const startedAt = new Date(endedAt.getTime() - parsed.durationSeconds * 1000);
      await onQuickLog({
        title: parsed.description,
        projectId,
        priority,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: parsed.durationSeconds,
      });
    } else {
      await onStartByTitle(parsed.description, { projectId, priority });
    }
    setInput('');
  };

  const runningProject = runningTask?.project_id
    ? projects.find((p) => p.id === runningTask.project_id) || null
    : null;

  return (
    <div className="space-y-3" ref={wrapperRef}>
      <div className="relative">
        <div
          className={`rounded-2xl border bg-card text-card-foreground px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors ${
            isRunning ? 'border-saffron/50' : 'border-border focus-within:border-foreground/25'
          }`}
        >
          <div className="flex-1 min-w-0">
            {isRunning ? (
              <button
                type="button"
                onClick={onOpenRunningTask}
                className="w-full text-left min-w-0 cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-saffron animate-pulse shrink-0" aria-hidden="true" />
                  <span className="text-base truncate group-hover:underline underline-offset-4 decoration-border">
                    {runningEntry?.description}
                  </span>
                </span>
                {runningProject && (
                  <span className="block pl-4 text-xs text-muted-foreground">{runningProject.name}</span>
                )}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  value={input}
                  onFocus={() => setOpen(true)}
                  placeholder="What are you working on?"
                  onChange={(e) => {
                    setInput(e.target.value);
                    setOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                    if (e.key === 'ArrowDown' && suggestions.length) {
                      e.preventDefault();
                      setOpen(true);
                      setActive((i) => Math.min(suggestions.length - 1, i + 1));
                    }
                    if (e.key === 'ArrowUp' && suggestions.length) {
                      e.preventDefault();
                      setActive((i) => Math.max(-1, i - 1));
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (open && active >= 0 && suggestions[active]) pick(suggestions[active]);
                      else handleSubmit();
                    }
                  }}
                  aria-label="Task name"
                  className="w-full text-base bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
                {input.trim() && (parsed.durationSeconds || parsed.projectName) ? (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {[
                      parsed.durationSeconds ? `Log ${formatReadableDuration(parsed.durationSeconds)}` : null,
                      parsed.projectName ? `#${parsed.projectName}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : (
                  <span className="hidden sm:block text-xs text-muted-foreground/80 mt-0.5">
                    Type “1h45” to log finished work · #project · !high
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {isRunning && (
              <span className="font-mono text-xl tabular-nums text-saffron mr-1">
                {formatDuration(elapsedSeconds)}
              </span>
            )}

            {!isRunning && (
              <button
                type="button"
                onClick={onOpenManual}
                title="Log finished work (M)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log time</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-opacity cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${
                isRunning ? 'bg-foreground text-background' : 'bg-saffron text-saffron-foreground'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                  <span>Stop</span>
                </>
              ) : isQuickLog ? (
                <>
                  <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                  <span>Start</span>
                </>
              )}
            </button>
          </div>
        </div>

        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 z-30 rounded-xl bg-card text-card-foreground shadow-lg ring-1 ring-border p-1.5">
            <p className="px-2.5 pt-1 pb-1.5 text-[11px] text-muted-foreground">
              {suggestions[0].kind === 'project' ? 'Projects' : 'Continue a task'}
            </p>
            {suggestions.map((s, idx) => {
              const color = s.project?.color;
              return (
                <button
                  key={s.kind === 'task' ? s.task.id : s.project.id}
                  type="button"
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => pick(s)}
                  className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-sm text-left cursor-pointer ${
                    idx === active ? 'bg-muted' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color || 'var(--border)' }}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {s.kind === 'task' ? s.task.title : `#${s.project.name}`}
                    </span>
                  </span>
                  {s.kind === 'task' && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDayLabel(s.task.day)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isForgotten && runningEntry && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-saffron/10 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-saffron shrink-0" aria-hidden="true" />
            <span>
              Running for <strong className="font-mono">{formatReadableDuration(elapsedSeconds)}</strong>. Still
              working?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStopTimer(new Date(Date.now() - 2 * 3600 * 1000))}
              className="px-3 py-1 rounded-full bg-card hover:bg-muted text-xs cursor-pointer"
            >
              Stop 2h ago
            </button>
            <button
              type="button"
              onClick={() => onStopTimer()}
              className="px-3 py-1 rounded-full bg-saffron text-saffron-foreground text-xs font-medium cursor-pointer"
            >
              Stop now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
