'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { EditorialNav } from '@/components/layout/EditorialNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { TrackerBar } from '@/components/tracker/TrackerBar';
import { ManualEntryModal } from '@/components/tracker/ManualEntryModal';
import { SplitEntryModal } from '@/components/tracker/SplitEntryModal';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskPanel } from '@/components/tasks/TaskPanel';
import { stripWindowForDay } from '@/components/tasks/DayStrip';
import { useTracker } from '@/hooks/useTracker';
import { useProjects } from '@/hooks/useProjects';
import { Task, TimeEntry } from '@/types';
import {
  formatDayLabel,
  formatDuration,
  formatReadableDuration,
  formatTimeShort,
  todayKey,
} from '@/lib/utils';

const MIN_GAP_SECONDS = 15 * 60;

export default function DashboardPage() {
  const tr = useTracker();
  const { projects, createProject } = useProjects();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [gapRange, setGapRange] = useState<{ startedAt: string; endedAt: string } | null>(null);
  const [showGaps, setShowGaps] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<TimeEntry | null>(null);
  const [earlierDays, setEarlierDays] = useState(0);
  const [today, setToday] = useState<string>('');

  // Local date is only known in the browser
  useEffect(() => {
    setToday(todayKey());
    const id = setInterval(() => setToday(todayKey()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ---------- panel <-> URL (?task=id), so Back closes it ---------- */
  useEffect(() => {
    const read = () => setSelectedTaskId(new URL(window.location.href).searchParams.get('task'));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const openTask = useCallback((id: string, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('task', id);
    if (replace) window.history.replaceState({ task: id }, '', url);
    else window.history.pushState({ task: id }, '', url);
    setSelectedTaskId(id);
  }, []);

  const closeTask = useCallback(() => {
    setSelectedTaskId(null);
    if (window.history.state?.task) {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      window.history.replaceState(null, '', url);
    }
  }, []);

  /* ---------- derived data ---------- */
  const nowMs = Date.now();
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const sessionsByTask = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    tr.allEntries.forEach((e) => {
      if (!e.task_id) return;
      if (!map.has(e.task_id)) map.set(e.task_id, []);
      map.get(e.task_id)!.push(e);
    });
    return map;
  }, [tr.allEntries]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    [...tr.tasks]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .forEach((t) => {
        if (!map.has(t.day)) map.set(t.day, []);
        map.get(t.day)!.push(t);
      });
    return map;
  }, [tr.tasks]);

  const runningTaskId = tr.runningEntry?.task_id ?? null;
  const runningTask = runningTaskId ? tr.tasks.find((t) => t.id === runningTaskId) || null : null;

  const taskSeconds = useCallback(
    (taskId: string) =>
      (sessionsByTask.get(taskId) || []).reduce((s, e) => s + (e.duration_seconds || 0), 0) +
      (taskId === runningTaskId ? tr.elapsedSeconds : 0),
    [sessionsByTask, runningTaskId, tr.elapsedSeconds]
  );

  const todaysTasks = today ? tasksByDay.get(today) || [] : [];
  const todaysSessions = todaysTasks.flatMap((t) => sessionsByTask.get(t.id) || []);
  const todaySeconds = todaysTasks.reduce((s, t) => s + taskSeconds(t.id), 0);

  const gaps = useMemo(() => {
    const sorted = todaysSessions
      .filter((s) => s.ended_at)
      .sort((a, b) => a.started_at.localeCompare(b.started_at));
    const list: { startedAt: string; endedAt: string; seconds: number }[] = [];
    let cursor: number | null = null;
    sorted.forEach((s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.ended_at!).getTime();
      if (cursor !== null && start - cursor >= MIN_GAP_SECONDS * 1000) {
        list.push({
          startedAt: new Date(cursor).toISOString(),
          endedAt: s.started_at,
          seconds: Math.round((start - cursor) / 1000),
        });
      }
      cursor = cursor === null ? end : Math.max(cursor, end);
    });
    return list;
  }, [todaysSessions]);
  const untrackedSeconds = gaps.reduce((s, g) => s + g.seconds, 0);

  const pastDays = useMemo(
    () => Array.from(tasksByDay.keys()).filter((d) => today && d < today).sort().reverse(),
    [tasksByDay, today]
  );
  const visiblePastDays = pastDays.slice(0, earlierDays);

  // Latest card of each thread, for ⌘K
  const recentThreads = useMemo(() => {
    const seen = new Set<string>();
    return [...tr.tasks]
      .sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at))
      .filter((t) => (seen.has(t.thread_id) ? false : (seen.add(t.thread_id), true)))
      .slice(0, 6);
  }, [tr.tasks]);

  const taskTitles = useMemo(() => recentThreads.map((t) => t.title), [recentThreads]);

  const selectedTask = selectedTaskId ? tr.tasks.find((t) => t.id === selectedTaskId) || null : null;

  /* ---------- actions ---------- */
  const resume = useCallback(
    async (task: Task) => {
      const target = await tr.resumeTask(task);
      if (target && selectedTaskId === task.id && target.id !== task.id) openTask(target.id, true);
    },
    [tr, selectedTaskId, openTask]
  );

  const stop = useCallback(() => tr.stopTimer(), [tr]);

  // Keyboard: ⌘K palette, T start/stop, M log time, Esc close panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && selectedTaskId && !isManualOpen && !gapRange && !splitTarget) {
        closeTask();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (tr.isRunning) tr.stopTimer();
        else tr.startByTitle('');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsManualOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tr, selectedTaskId, isManualOpen, gapRange, splitTarget, closeTask]);

  const renderCards = (dayKey: string, list: Task[]) => {
    const daySessions = list.flatMap((t) => sessionsByTask.get(t.id) || []);
    const stripWindow = stripWindowForDay(dayKey, daySessions, nowMs);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            project={task.project_id ? projectMap.get(task.project_id) || null : null}
            sessions={sessionsByTask.get(task.id) || []}
            isRunning={task.id === runningTaskId}
            elapsedSeconds={tr.elapsedSeconds}
            window={stripWindow}
            nowMs={nowMs}
            onOpen={() => openTask(task.id)}
            onResume={() => resume(task)}
            onStop={stop}
          />
        ))}
      </div>
    );
  };

  const isLoading = tr.isLoading || tr.tasksLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <EditorialNav
        isCloudConnected={tr.isCloudConnected}
        onOpenPalette={() => setIsPaletteOpen(true)}
        runningLabel={tr.runningEntry?.description || null}
        elapsedSeconds={tr.elapsedSeconds}
        onStopTimer={stop}
      />

      <main className="flex-1 mx-auto w-full max-w-5xl px-5 sm:px-8 py-8 sm:py-12 space-y-10">
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              Today
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {today
                  ? new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
                  : ''}
              </span>
            </h1>
            <span className="font-mono text-lg tabular-nums">
              {tr.isRunning ? formatDuration(todaySeconds) : formatReadableDuration(todaySeconds)}
            </span>
          </div>

          <TrackerBar
            projects={projects}
            tasks={tr.tasks}
            runningEntry={tr.runningEntry}
            runningTask={runningTask}
            elapsedSeconds={tr.elapsedSeconds}
            onStartByTitle={tr.startByTitle}
            onResumeTask={resume}
            onStopTimer={stop}
            onQuickLog={(d) => tr.logSession({ ...d, source: 'manual' })}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenRunningTask={runningTaskId ? () => openTask(runningTaskId) : undefined}
            onCreateProject={createProject}
          />
        </section>

        <section className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : todaysTasks.length === 0 ? (
            <div className="rounded-2xl bg-muted/50 px-6 py-10 text-center space-y-1">
              <p className="text-sm">Nothing tracked yet today.</p>
              <p className="text-xs text-muted-foreground">
                Start a timer above, or press T to start an untitled one.
              </p>
            </div>
          ) : (
            renderCards(today, todaysTasks)
          )}

          {untrackedSeconds > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGaps((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {formatReadableDuration(untrackedSeconds)} untracked today
                <ChevronDown className={`w-3 h-3 transition-transform ${showGaps ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showGaps && (
                <div className="absolute left-0 mt-2 z-20 w-64 rounded-xl bg-card shadow-lg ring-1 ring-border p-1.5">
                  <p className="px-2.5 pt-1 pb-1.5 text-[11px] text-muted-foreground">Fill a gap</p>
                  {gaps.map((g) => (
                    <button
                      key={g.startedAt}
                      type="button"
                      onClick={() => {
                        setShowGaps(false);
                        setGapRange({ startedAt: g.startedAt, endedAt: g.endedAt });
                      }}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted cursor-pointer"
                    >
                      <span className="font-mono tabular-nums">
                        {formatTimeShort(g.startedAt)} – {formatTimeShort(g.endedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatReadableDuration(g.seconds)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {pastDays.length > 0 && (
          <section className="space-y-8">
            {visiblePastDays.map((day) => {
              const list = tasksByDay.get(day) || [];
              const total = list.reduce((s, t) => s + taskSeconds(t.id), 0);
              return (
                <div key={day} className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-medium">{formatDayLabel(day)}</h2>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatReadableDuration(total)}
                    </span>
                  </div>
                  {renderCards(day, list)}
                </div>
              );
            })}

            <div className="flex items-center gap-4">
              {earlierDays < pastDays.length && (
                <button
                  type="button"
                  onClick={() => setEarlierDays((n) => n + 7)}
                  className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {earlierDays === 0 ? 'Earlier days ›' : 'Show more ›'}
                </button>
              )}
              {earlierDays > 0 && (
                <button
                  type="button"
                  onClick={() => setEarlierDays(0)}
                  className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Hide earlier days
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          projects={projects}
          sessions={sessionsByTask.get(selectedTask.id) || []}
          isRunning={selectedTask.id === runningTaskId}
          elapsedSeconds={tr.elapsedSeconds}
          threadDays={tr.tasks
            .filter((t) => t.thread_id === selectedTask.thread_id && t.id !== selectedTask.id)
            .sort((a, b) => b.day.localeCompare(a.day))
            .map((t) => ({ task: t, seconds: taskSeconds(t.id) }))}
          sameDayTasks={(tasksByDay.get(selectedTask.day) || []).filter((t) => t.id !== selectedTask.id)}
          onClose={closeTask}
          onResume={() => resume(selectedTask)}
          onStop={stop}
          onRename={(title) => tr.renameTask(selectedTask, title)}
          onCombineInto={async (target) => {
            await tr.combineTasks(selectedTask, target);
            openTask(target.id, true);
          }}
          onSetProject={(pid) => tr.setTaskProject(selectedTask, pid)}
          onUpdateTask={(u) => tr.updateTask(selectedTask.id, u)}
          onCreateProject={createProject}
          onUpdateSession={(id, u) => tr.updateEntry(id, u)}
          onDeleteSession={(entry) => tr.deleteSession(entry)}
          onSplitSession={(entry) => setSplitTarget(entry)}
          onMoveSession={(entry, target) => tr.moveSession(entry, target)}
          onLogTime={(startedAt, secs) =>
            tr.logSession({
              title: selectedTask.title,
              taskId: selectedTask.id,
              startedAt: startedAt.toISOString(),
              endedAt: new Date(startedAt.getTime() + secs * 1000).toISOString(),
              durationSeconds: secs,
              source: 'manual',
            })
          }
          onDeleteTask={async () => {
            closeTask();
            await tr.deleteTask(selectedTask);
          }}
          onOpenTask={(t) => openTask(t.id, true)}
        />
      )}

      <ManualEntryModal
        isOpen={isManualOpen || !!gapRange}
        projects={projects}
        taskTitles={taskTitles}
        defaultRange={gapRange}
        onClose={() => {
          setIsManualOpen(false);
          setGapRange(null);
        }}
        onSubmit={(d) =>
          tr.logSession({
            title: d.description,
            projectId: d.projectId,
            startedAt: d.startedAt,
            endedAt: d.endedAt,
            durationSeconds: d.durationSeconds,
            source: d.source,
          })
        }
      />

      <SplitEntryModal
        entry={splitTarget}
        onClose={() => setSplitTarget(null)}
        onSplit={tr.splitEntry}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        isRunning={tr.isRunning}
        onToggleTimer={() => (tr.isRunning ? tr.stopTimer() : tr.startByTitle(''))}
        onOpenManual={() => setIsManualOpen(true)}
        recentTasks={recentThreads}
        onResumeTask={resume}
      />

      {tr.syncError && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-lg border border-saffron/50 bg-card text-card-foreground text-xs shadow-lg">
          <span className="flex-1 font-mono break-words">{tr.syncError}</span>
          <button
            type="button"
            onClick={tr.clearSyncError}
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {tr.undo && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-foreground text-background text-xs shadow-lg">
          <span>{tr.undo.label}</span>
          <button
            type="button"
            onClick={tr.runUndo}
            className="inline-flex items-center gap-1 font-medium text-saffron hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
