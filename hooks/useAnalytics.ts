'use client';

import { useMemo } from 'react';
import { TimeEntry, TimePeriod, AnalyticsSummary, Project, Task } from '@/types';
import { getLocalDayKey } from '@/lib/utils';

export interface ProjectDrilldownTask {
  key: string;
  title: string;
  taskId: string | null;
  seconds: number;
  hours: string;
  percentage: number;
  estimateSeconds: number | null;
}

export interface ProjectDrilldownItem {
  projectId: string | null;
  name: string;
  color: string;
  seconds: number;
  hours: string;
  percentage: number;
  tasks: ProjectDrilldownTask[];
}

export interface DailyStackedDay {
  dayKey: string;
  label: string;
  totalSeconds: number;
  segments: {
    projectId: string | null;
    name: string;
    color: string;
    seconds: number;
  }[];
}

export function getPeriodBounds(
  period: TimePeriod,
  offset = 0
): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'day') {
    start.setDate(now.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    const label =
      offset === 0
        ? 'Today'
        : offset === -1
        ? 'Yesterday'
        : start.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
    return { start, end, label };
  }

  if (period === 'week') {
    const dayOfWeek = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - dayOfWeek + offset * 7);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const label =
      offset === 0
        ? `This week (${fmt(start)} – ${fmt(end)})`
        : `${fmt(start)} – ${fmt(end)}`;
    return { start, end, label };
  }

  start.setFullYear(now.getFullYear(), now.getMonth() + offset, 1);
  start.setHours(0, 0, 0, 0);
  end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  const label = start.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  return { start, end, label };
}

function summarize(
  entries: TimeEntry[],
  start: Date,
  end: Date
): { summary: AnalyticsSummary; filtered: TimeEntry[] } {
  const filtered = entries.filter((e) => {
    if (!e.ended_at || !e.duration_seconds) return false;
    const t = new Date(e.started_at).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const totalSeconds = filtered.reduce(
    (acc, c) => acc + (c.duration_seconds || 0),
    0
  );
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const activeDays = new Set(filtered.map((e) => getLocalDayKey(e.started_at))).size;
  const focusBlocksCount = filtered.filter(
    (e) => (e.duration_seconds || 0) >= 5400
  ).length;

  let timerSeconds = 0;
  let manualSeconds = 0;
  const taskMap: Record<string, { seconds: number; projectId: string | null }> = {};

  filtered.forEach((e) => {
    const dur = e.duration_seconds || 0;
    if (e.source === 'timer') timerSeconds += dur;
    else manualSeconds += dur;

    const desc = e.description?.trim() || 'Untitled Task';
    if (!taskMap[desc]) {
      taskMap[desc] = { seconds: 0, projectId: e.project_id };
    }
    taskMap[desc].seconds += dur;
  });

  const taskBreakdown = Object.entries(taskMap)
    .map(([description, info]) => ({
      description,
      projectId: info.projectId,
      seconds: info.seconds,
      hours: (info.seconds / 3600).toFixed(1),
      percentage:
        totalSeconds > 0 ? Math.round((info.seconds / totalSeconds) * 100) : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    filtered,
    summary: {
      totalSeconds,
      totalHours,
      entryCount: filtered.length,
      activeDays,
      focusBlocksCount,
      timerSeconds,
      manualSeconds,
      taskBreakdown,
    },
  };
}

export function useAnalytics(
  entries: TimeEntry[],
  period: TimePeriod,
  offset = 0,
  projects: Project[] = [],
  tasks: Task[] = []
) {
  return useMemo(() => {
    const currentBounds = getPeriodBounds(period, offset);
    const prevBounds = getPeriodBounds(period, offset - 1);

    const { summary: current, filtered } = summarize(
      entries,
      currentBounds.start,
      currentBounds.end
    );
    const { summary: previous } = summarize(
      entries,
      prevBounds.start,
      prevBounds.end
    );

    const deltaHours = (current.totalSeconds - previous.totalSeconds) / 3600;
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const taskEntityMap = new Map(tasks.map((t) => [t.id, t]));

    // 1. Project -> Task drill-down
    const projGroups = new Map<
      string,
      {
        projectId: string | null;
        name: string;
        color: string;
        seconds: number;
        tasks: Map<
          string,
          { title: string; taskId: string | null; seconds: number; estimateSeconds: number | null }
        >;
      }
    >();

    filtered.forEach((e) => {
      const pid = e.project_id;
      const projKey = pid || '__untagged__';
      const projObj = pid ? projectMap.get(pid) : null;
      const projName = projObj ? projObj.name : 'No Project';
      const projColor = projObj ? projObj.color : '#a1a1aa';

      if (!projGroups.has(projKey)) {
        projGroups.set(projKey, {
          projectId: pid,
          name: projName,
          color: projColor,
          seconds: 0,
          tasks: new Map(),
        });
      }

      const group = projGroups.get(projKey)!;
      const dur = e.duration_seconds || 0;
      group.seconds += dur;

      const linkedTask = e.task_id ? taskEntityMap.get(e.task_id) : null;
      // Same task on different days shares a thread: count it as one task
      const taskKey =
        linkedTask?.thread_id || e.task_id || `desc:${(e.description || 'Untitled').trim().toLowerCase()}`;
      const taskTitle = linkedTask?.title || e.description?.trim() || 'Untitled Task';

      if (!group.tasks.has(taskKey)) {
        group.tasks.set(taskKey, {
          title: taskTitle,
          taskId: e.task_id,
          seconds: 0,
          estimateSeconds: linkedTask?.estimate_seconds ?? null,
        });
      }
      group.tasks.get(taskKey)!.seconds += dur;
    });

    const projectBreakdown: ProjectDrilldownItem[] = Array.from(projGroups.values())
      .map((g) => ({
        projectId: g.projectId,
        name: g.name,
        color: g.color,
        seconds: g.seconds,
        hours: (g.seconds / 3600).toFixed(1),
        percentage:
          current.totalSeconds > 0
            ? Math.round((g.seconds / current.totalSeconds) * 100)
            : 0,
        tasks: Array.from(g.tasks.entries())
          .map(([key, t]) => ({
            key,
            title: t.title,
            taskId: t.taskId,
            seconds: t.seconds,
            hours: (t.seconds / 3600).toFixed(1),
            percentage:
              current.totalSeconds > 0
                ? Math.round((t.seconds / current.totalSeconds) * 100)
                : 0,
            estimateSeconds: t.estimateSeconds,
          }))
          .sort((a, b) => b.seconds - a.seconds),
      }))
      .sort((a, b) => b.seconds - a.seconds);

    // 2. Stacked daily bars for week & month views
    const dailyStacked: DailyStackedDay[] = [];
    if (period === 'week' || period === 'month') {
      const dayBuckets = new Map<string, Map<string, number>>();
      filtered.forEach((e) => {
        const dk = getLocalDayKey(e.started_at);
        if (!dayBuckets.has(dk)) dayBuckets.set(dk, new Map());
        const pKey = e.project_id || '__untagged__';
        const m = dayBuckets.get(dk)!;
        m.set(pKey, (m.get(pKey) || 0) + (e.duration_seconds || 0));
      });

      const cursor = new Date(currentBounds.start);
      while (cursor <= currentBounds.end) {
        const dk = getLocalDayKey(cursor.toISOString());
        const label =
          period === 'week'
            ? cursor.toLocaleDateString(undefined, { weekday: 'short' })
            : String(cursor.getDate());
        const bucket = dayBuckets.get(dk);

        const segments: DailyStackedDay['segments'] = [];
        let totalSeconds = 0;

        if (bucket) {
          bucket.forEach((secs, pKey) => {
            totalSeconds += secs;
            const proj = pKey === '__untagged__' ? null : projectMap.get(pKey);
            segments.push({
              projectId: pKey === '__untagged__' ? null : pKey,
              name: proj ? proj.name : 'No Project',
              color: proj ? proj.color : '#a1a1aa',
              seconds: secs,
            });
          });
        }

        dailyStacked.push({ dayKey: dk, label, totalSeconds, segments });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return {
      ...current,
      periodLabel: currentBounds.label,
      bounds: currentBounds,
      deltaHours,
      previousTotalHours: previous.totalHours,
      projectBreakdown,
      dailyStacked,
    };
  }, [entries, period, offset, projects, tasks]);
}
