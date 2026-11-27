'use client';

import { useCallback, useState } from 'react';
import { Task, TaskPriority, TimeEntry, EntrySource } from '@/types';
import { useTasks } from './useTasks';
import { useTimeEntries } from './useTimeEntries';
import { getLocalDayKey, normalizeTitle, todayKey } from '@/lib/utils';

export type UndoAction =
  | { kind: 'discarded'; label: string; entry: TimeEntry; task: Task | null }
  | { kind: 'session-deleted'; label: string; entry: TimeEntry }
  | { kind: 'task-deleted'; label: string; task: Task; entries: TimeEntry[] };

/**
 * Ties tasks (day cards) and sessions together and holds the resume rules:
 * - Resuming a task from an earlier day creates (once) a copy of it for today,
 *   and every later resume adds sessions to that copy. The earlier day is untouched.
 * - No name → "Untitled N".
 * - Accidental start/stop is joined or discarded (see useTimeEntries).
 */
export function useTracker() {
  const t = useTasks();
  const e = useTimeEntries();
  const [undo, setUndo] = useState<UndoAction | null>(null);

  const offerUndo = useCallback((action: UndoAction) => {
    setUndo(action);
    setTimeout(() => setUndo((curr) => (curr === action ? null : curr)), 6000);
  }, []);

  /** The card for this task's thread today, creating it if needed */
  const todaysCopy = useCallback(
    async (task: Task): Promise<Task | null> => {
      const today = todayKey();
      if (task.day === today) return task;
      return (
        t.findThreadTaskForDay(today, task.thread_id) ||
        (await t.createTask({
          title: task.title,
          day: today,
          projectId: task.project_id,
          priority: task.priority,
          estimateSeconds: task.estimate_seconds,
          threadId: task.thread_id,
        }))
      );
    },
    [t]
  );

  /** Resume a task: always records a new session on today's card. Returns that card. */
  const resumeTask = useCallback(
    async (task: Task): Promise<Task | null> => {
      const target = await todaysCopy(task);
      if (target) await e.startSession(target);
      return target;
    },
    [todaysCopy, e]
  );

  /** Start the timer by name (typed in the bar). Empty name → Untitled N. */
  const startByTitle = useCallback(
    async (
      rawTitle: string,
      opts: { projectId?: string | null; priority?: TaskPriority } = {}
    ): Promise<Task | null> => {
      const today = todayKey();
      const title = rawTitle.trim() || t.nextUntitledTitle(today);
      const existing = t.findTaskForDay(today, title);
      if (existing) {
        await e.startSession(existing);
        return existing;
      }
      const task = await t.createTask({
        title,
        day: today,
        projectId: opts.projectId,
        priority: opts.priority,
      });
      if (task) await e.startSession(task);
      return task;
    },
    [t, e]
  );

  /** Log a finished session. It goes on the card for the day the time belongs to. */
  const logSession = useCallback(
    async (data: {
      title: string;
      taskId?: string | null;
      projectId?: string | null;
      priority?: TaskPriority;
      startedAt: string;
      endedAt: string;
      durationSeconds: number;
      source?: EntrySource;
    }) => {
      const day = getLocalDayKey(data.startedAt);
      let task: Task | null = data.taskId
        ? t.tasks.find((x) => x.id === data.taskId) || null
        : null;
      if (task && task.day !== day) task = null;
      if (!task) {
        const title = data.title.trim() || t.nextUntitledTitle(day);
        task =
          t.findTaskForDay(day, title) ||
          (await t.createTask({
            title,
            day,
            projectId: data.projectId,
            priority: data.priority,
          }));
      }
      if (task) {
        await e.addSession(task, data);
      }
    },
    [t, e]
  );

  /** Stop the timer; an accidental (< 5s) session is discarded with Undo */
  const stopTimer = useCallback(
    async (customEndedAt?: Date) => {
      const { discarded } = await e.stopTimer(customEndedAt);
      if (!discarded) return;

      // If the accidental start also created the card, remove the empty card too
      let removedTask: Task | null = null;
      const task = discarded.task_id
        ? t.tasks.find((x) => x.id === discarded.task_id) || null
        : null;
      if (task) {
        const others = e.sessionsForTask(task.id);
        const createdRecently = Date.now() - new Date(task.created_at).getTime() < 2 * 60 * 1000;
        if (others.length === 0 && createdRecently) {
          await t.deleteTask(task.id);
          removedTask = task;
        }
      }
      offerUndo({
        kind: 'discarded',
        label: 'Discarded a session under 5 seconds',
        entry: discarded,
        task: removedTask,
      });
    },
    [e, t, offerUndo]
  );

  /** Rename. Returns the clashing task if another card that day already has the name. */
  const renameTask = useCallback(
    async (task: Task, rawTitle: string): Promise<{ conflict: Task | null }> => {
      const title = rawTitle.trim().replace(/\s+/g, ' ');
      if (!title || title === task.title) return { conflict: null };
      const clash = t.findTaskForDay(task.day, title);
      if (clash && clash.id !== task.id) return { conflict: clash };

      // A renamed card joins the thread of other days with that name, if any
      const norm = normalizeTitle(title);
      const sameTitle = t.tasks.find(
        (x) => x.id !== task.id && normalizeTitle(x.title) === norm
      );
      const threadUpdate =
        normalizeTitle(task.title) !== norm && sameTitle
          ? { thread_id: sameTitle.thread_id }
          : {};

      await t.updateTask(task.id, { title, ...threadUpdate });
      await e.syncTaskFields(task.id, { description: title });
      return { conflict: null };
    },
    [t, e]
  );

  const setTaskProject = useCallback(
    async (task: Task, projectId: string | null) => {
      await t.updateTask(task.id, { project_id: projectId });
      await e.syncTaskFields(task.id, { project_id: projectId });
    },
    [t, e]
  );

  /** Move all sessions of `from` into `into` (same day) and remove `from` */
  const combineTasks = useCallback(
    async (from: Task, into: Task) => {
      const ids = e.sessionsForTask(from.id).map((x) => x.id);
      await e.moveEntriesToTask(ids, into);
      await t.deleteTask(from.id);
    },
    [e, t]
  );

  const moveSession = useCallback(
    async (entry: TimeEntry, into: Task) => {
      await e.moveEntriesToTask([entry.id], into);
    },
    [e]
  );

  const deleteSession = useCallback(
    async (entry: TimeEntry) => {
      const removed = await e.deleteEntry(entry.id);
      if (removed) offerUndo({ kind: 'session-deleted', label: 'Session deleted', entry: removed });
    },
    [e, offerUndo]
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      if (e.runningEntry?.task_id === task.id) await e.stopTimer(new Date());
      const removed = e.forgetTaskEntries(task.id);
      await t.deleteTask(task.id);
      offerUndo({ kind: 'task-deleted', label: `Deleted “${task.title}”`, task, entries: removed });
    },
    [e, t, offerUndo]
  );

  const runUndo = useCallback(async () => {
    const action = undo;
    if (!action) return;
    setUndo(null);
    if (action.kind === 'discarded') {
      if (action.task) await t.restoreTask(action.task);
      // The discarded session was still running: bring it back running if the timer is free
      if (e.runningEntry) {
        const startMs = new Date(action.entry.started_at).getTime();
        await e.restoreEntry({
          ...action.entry,
          ended_at: new Date(startMs + 1000).toISOString(),
          duration_seconds: 1,
        });
      } else {
        await e.restoreEntry(action.entry);
      }
    } else if (action.kind === 'session-deleted') {
      await e.restoreEntry(action.entry);
    } else {
      await t.restoreTask(action.task);
      for (const entry of action.entries) await e.restoreEntry(entry);
    }
  }, [undo, t, e]);

  return {
    ...t,
    ...e,
    tasks: t.tasks,
    tasksLoading: t.isLoading,
    resumeTask,
    startByTitle,
    logSession,
    stopTimer,
    renameTask,
    setTaskProject,
    combineTasks,
    moveSession,
    deleteSession,
    deleteTask,
    undo,
    runUndo,
    dismissUndo: () => setUndo(null),
    syncError: t.syncError || e.syncError,
    clearSyncError: () => {
      t.clearSyncError();
      e.clearSyncError();
    },
  };
}
