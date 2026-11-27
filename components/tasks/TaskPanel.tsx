'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Play, Plus, Square, Timer, PencilLine, X } from 'lucide-react';
import { Project, Task, TaskPriority, TimeEntry } from '@/types';
import { ProjectDotPicker } from '@/components/projects/ProjectDotPicker';
import {
  dayAt,
  formatDayLabel,
  formatDuration,
  formatReadableDuration,
  formatTimeShort,
  parseDurationInput,
  todayKey,
} from '@/lib/utils';

interface TaskPanelProps {
  task: Task;
  projects: Project[];
  sessions: TimeEntry[];
  isRunning: boolean;
  elapsedSeconds: number;
  /** Same task on other days (thread), newest first */
  threadDays: { task: Task; seconds: number }[];
  /** Other cards on the same day, for Move / Combine */
  sameDayTasks: Task[];
  onClose: () => void;
  onResume: () => void;
  onStop: () => void;
  onRename: (title: string) => Promise<{ conflict: Task | null }>;
  onCombineInto: (target: Task) => void;
  onSetProject: (projectId: string | null) => void;
  onUpdateTask: (updates: Partial<Task>) => void;
  onCreateProject: (name: string) => Promise<Project | null>;
  onUpdateSession: (id: string, updates: Partial<TimeEntry>) => void;
  onDeleteSession: (entry: TimeEntry) => void;
  onSplitSession: (entry: TimeEntry) => void;
  onMoveSession: (entry: TimeEntry, target: Task) => void;
  onLogTime: (startedAt: Date, durationSeconds: number) => void;
  onDeleteTask: () => void;
  onOpenTask: (task: Task) => void;
}

/* Side panel (bottom sheet on mobile) listing every session of one task card. */
export function TaskPanel(props: TaskPanelProps) {
  const {
    task,
    projects,
    sessions,
    isRunning,
    elapsedSeconds,
    threadDays,
    sameDayTasks,
    onClose,
    onResume,
    onStop,
    onRename,
    onCombineInto,
    onSetProject,
    onUpdateTask,
    onCreateProject,
    onLogTime,
    onDeleteTask,
    onOpenTask,
  } = props;

  const [title, setTitle] = useState(task.title);
  const [conflict, setConflict] = useState<Task | null>(null);
  const [logInput, setLogInput] = useState('');
  const [logError, setLogError] = useState<string | null>(null);
  const [estimateInput, setEstimateInput] = useState(
    task.estimate_seconds ? formatReadableDuration(task.estimate_seconds) : ''
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setConflict(null);
    setConfirmDelete(false);
    setLogInput('');
    setLogError(null);
    setEstimateInput(task.estimate_seconds ? formatReadableDuration(task.estimate_seconds) : '');
  }, [task.id, task.title, task.estimate_seconds]);

  const ordered = [...sessions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  const totalSeconds =
    sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) +
    (isRunning ? elapsedSeconds : 0);
  const threadTotal =
    totalSeconds + threadDays.reduce((sum, d) => sum + d.seconds, 0);
  const isToday = task.day === todayKey();

  const commitTitle = async () => {
    const next = title.trim();
    if (!next || next === task.title) {
      setTitle(task.title);
      return;
    }
    const { conflict: clash } = await onRename(next);
    setConflict(clash);
  };

  const commitEstimate = () => {
    const raw = estimateInput.trim();
    const secs = raw ? parseDurationInput(raw) : null;
    if (raw && !secs) {
      setEstimateInput(task.estimate_seconds ? formatReadableDuration(task.estimate_seconds) : '');
      return;
    }
    if (secs !== task.estimate_seconds) onUpdateTask({ estimate_seconds: secs });
  };

  const submitLog = (e: React.FormEvent) => {
    e.preventDefault();
    const secs = parseDurationInput(logInput);
    if (!secs) {
      setLogError('Try 45m, 1h30 or 1:30');
      return;
    }
    let startedAt: Date;
    if (isToday) {
      startedAt = new Date(Date.now() - secs * 1000);
    } else {
      const lastEnd = ordered.length
        ? new Date(ordered[ordered.length - 1].ended_at || ordered[ordered.length - 1].started_at)
        : dayAt(task.day, 9);
      startedAt = lastEnd;
    }
    onLogTime(startedAt, secs);
    setLogInput('');
    setLogError(null);
  };

  const estimatePct =
    task.estimate_seconds && task.estimate_seconds > 0
      ? Math.min(100, Math.round((threadTotal / task.estimate_seconds) * 100))
      : null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={task.title}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />

      <aside className="absolute inset-x-0 bottom-0 h-[80vh] rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[440px] sm:rounded-none sm:rounded-l-2xl bg-card text-card-foreground shadow-2xl flex flex-col animate-[panel-in_180ms_ease-out]">
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted" aria-hidden="true" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-muted-foreground pt-1.5">{formatDayLabel(task.day)}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="p-1.5 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setConflict(null);
            }}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setTitle(task.title);
                e.stopPropagation();
              }
            }}
            aria-label="Task name"
            className="w-full text-xl font-semibold bg-transparent rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-muted focus:bg-muted focus:outline-none"
          />

          {conflict && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-xs">
              <span>
                “{conflict.title}” already exists {isToday ? 'today' : 'on this day'}.
              </span>
              <button
                type="button"
                onClick={() => onCombineInto(conflict)}
                className="shrink-0 font-medium text-saffron hover:underline cursor-pointer"
              >
                Combine into it
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ProjectDotPicker
              projects={projects}
              selectedProjectId={task.project_id}
              onSelect={onSetProject}
              onCreateProject={onCreateProject}
            />
            <select
              value={task.priority}
              onChange={(e) => onUpdateTask({ priority: e.target.value as TaskPriority })}
              aria-label="Priority"
              className="rounded-md bg-muted px-2 py-1 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <label className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
              <span className="text-muted-foreground">Est.</span>
              <input
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                onBlur={commitEstimate}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="—"
                className="w-12 bg-transparent font-mono focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Totals */}
        <div className="mx-6 rounded-xl bg-muted/60 px-4 py-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span
              className={`font-mono tabular-nums text-2xl ${isRunning ? 'text-saffron' : ''}`}
            >
              {isRunning ? formatDuration(totalSeconds) : formatReadableDuration(totalSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
              {threadDays.length > 0 && ` · ${formatReadableDuration(threadTotal)} all days`}
            </span>
          </div>
          {estimatePct !== null && (
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-background overflow-hidden">
                <div
                  className={`h-full rounded-full ${threadTotal > (task.estimate_seconds || 0) ? 'bg-saffron' : 'bg-foreground/50'}`}
                  style={{ width: `${estimatePct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatReadableDuration(threadTotal)} of {formatReadableDuration(task.estimate_seconds!)} estimated
              </p>
            </div>
          )}
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Sessions</h4>
            {ordered.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                No time yet. Resume to start a session, or log time below.
              </p>
            )}
            {ordered.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                dayKey={task.day}
                elapsedSeconds={elapsedSeconds}
                moveTargets={sameDayTasks}
                onUpdate={(u) => props.onUpdateSession(s.id, u)}
                onDelete={() => props.onDeleteSession(s)}
                onSplit={() => props.onSplitSession(s)}
                onMove={(target) => props.onMoveSession(s, target)}
              />
            ))}
          </section>

          {threadDays.length > 0 && (
            <section className="space-y-1">
              <button
                type="button"
                onClick={() => setShowEarlier((v) => !v)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showEarlier ? 'Hide other days' : `Other days (${threadDays.length})`}
              </button>
              {showEarlier &&
                threadDays.map((d) => (
                  <button
                    key={d.task.id}
                    type="button"
                    onClick={() => onOpenTask(d.task)}
                    className="w-full flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 text-sm hover:bg-muted cursor-pointer"
                  >
                    <span className="text-foreground/85">{formatDayLabel(d.task.day)}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatReadableDuration(d.seconds)}
                    </span>
                  </button>
                ))}
            </section>
          )}

          <section>
            {confirmDelete ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Delete this card and its sessions?</span>
                <button
                  type="button"
                  onClick={onDeleteTask}
                  className="font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Delete card
              </button>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-2 bg-muted/40 sm:rounded-bl-2xl">
          <button
            type="button"
            onClick={isRunning ? onStop : onResume}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 ${
              isRunning ? 'bg-foreground text-background' : 'bg-saffron text-saffron-foreground'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 fill-current" aria-hidden="true" /> Stop
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                {isToday ? 'Resume' : 'Resume today'}
              </>
            )}
          </button>

          <form onSubmit={submitLog} className="flex-1 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5">
            <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              value={logInput}
              onChange={(e) => {
                setLogInput(e.target.value);
                setLogError(null);
              }}
              placeholder={logError || (isToday ? 'Log time, e.g. 45m' : `Log time on ${formatDayLabel(task.day)}`)}
              aria-label="Log time"
              className={`w-full bg-transparent text-xs focus:outline-none ${logError ? 'placeholder:text-saffron' : 'placeholder:text-muted-foreground'}`}
            />
          </form>
        </div>
      </aside>
    </div>
  );
}

interface SessionRowProps {
  session: TimeEntry;
  dayKey: string;
  elapsedSeconds: number;
  moveTargets: Task[];
  onUpdate: (updates: Partial<TimeEntry>) => void;
  onDelete: () => void;
  onSplit: () => void;
  onMove: (target: Task) => void;
}

function toTimeInput(iso: string) {
  return formatTimeShort(iso);
}

/* One session: start–end (click to edit), duration, source, and a small menu. */
function SessionRow({
  session,
  dayKey,
  elapsedSeconds,
  moveTargets,
  onUpdate,
  onDelete,
  onSplit,
  onMove,
}: SessionRowProps) {
  const running = session.ended_at === null;
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(toTimeInput(session.started_at));
  const [end, setEnd] = useState(session.ended_at ? toTimeInput(session.ended_at) : '');
  const [menu, setMenu] = useState<'closed' | 'main' | 'move'>('closed');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu === 'closed') return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu('closed');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  const saveTimes = () => {
    setEditing(false);
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return;
    const startDate = dayAt(dayKey, sh, sm);
    const endDate = dayAt(dayKey, eh, em);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
    const startedAt = startDate.toISOString();
    const endedAt = endDate.toISOString();
    if (startedAt === session.started_at && endedAt === session.ended_at) return;
    onUpdate({
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: Math.round((endDate.getTime() - startDate.getTime()) / 1000),
      source: 'adjusted',
    });
  };

  const duration = running ? elapsedSeconds : session.duration_seconds || 0;
  const SourceIcon = session.source === 'timer' ? Timer : PencilLine;

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-muted/60">
      <SourceIcon
        className="w-3.5 h-3.5 text-muted-foreground shrink-0"
        aria-label={session.source === 'timer' ? 'Timer' : session.source === 'manual' ? 'Logged manually' : 'Edited'}
      />

      {editing && !running ? (
        <div className="flex items-center gap-1.5 text-sm font-mono">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            autoFocus
            className="bg-card rounded px-1.5 py-0.5 focus:outline-none"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveTimes()}
            className="bg-card rounded px-1.5 py-0.5 focus:outline-none"
          />
          <button
            type="button"
            onClick={saveTimes}
            className="text-xs font-sans font-medium text-saffron hover:underline cursor-pointer"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={running}
          onClick={() => {
            setStart(toTimeInput(session.started_at));
            setEnd(session.ended_at ? toTimeInput(session.ended_at) : '');
            setEditing(true);
          }}
          className="font-mono text-sm tabular-nums text-foreground/90 enabled:hover:text-foreground enabled:cursor-pointer"
          title={running ? undefined : 'Edit times'}
        >
          {formatTimeShort(session.started_at)} – {running ? 'now' : formatTimeShort(session.ended_at!)}
        </button>
      )}

      <span
        className={`ml-auto font-mono text-xs tabular-nums ${running ? 'text-saffron' : 'text-muted-foreground'}`}
      >
        {running ? formatDuration(duration) : formatReadableDuration(duration)}
      </span>

      {!running && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenu((m) => (m === 'closed' ? 'main' : 'closed'))}
            aria-label="Session options"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
          </button>
          {menu !== 'closed' && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg bg-card shadow-lg ring-1 ring-border p-1 text-xs">
              {menu === 'main' ? (
                <>
                  <MenuItem onClick={() => { setMenu('closed'); onSplit(); }}>Split…</MenuItem>
                  <MenuItem
                    disabled={moveTargets.length === 0}
                    onClick={() => setMenu('move')}
                  >
                    Move to another task…
                  </MenuItem>
                  <MenuItem danger onClick={() => { setMenu('closed'); onDelete(); }}>
                    Delete session
                  </MenuItem>
                </>
              ) : (
                <>
                  <p className="px-2 py-1 text-muted-foreground">Move to</p>
                  {moveTargets.map((t) => (
                    <MenuItem key={t.id} onClick={() => { setMenu('closed'); onMove(t); }}>
                      <span className="truncate">{t.title}</span>
                    </MenuItem>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center text-left rounded-md px-2 py-1.5 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default ${
        danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
