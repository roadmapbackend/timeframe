'use client';

import React from 'react';
import { AnalyticsSummary, Project } from '@/types';

interface MinimalBarChartProps {
  summary: AnalyticsSummary;
  projects?: Project[];
}

export function MinimalBarChart({ summary, projects = [] }: MinimalBarChartProps) {
  if (summary.taskBreakdown.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-6 text-center">
        <p className="text-xs text-zinc-400">No tasks logged in this period.</p>
      </div>
    );
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md overflow-hidden">
      <div className="grid grid-cols-12 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-2.5 bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
        <div className="col-span-6">Task</div>
        <div className="col-span-3">Share</div>
        <div className="col-span-3 text-right">Hours</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {summary.taskBreakdown.map((task) => {
          const proj = task.projectId ? projectMap.get(task.projectId) : null;
          return (
            <div
              key={task.description}
              className="grid grid-cols-12 items-center px-4 py-2.5 text-xs hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
            >
              <div className="col-span-6 flex items-center space-x-2 pr-3 min-w-0">
                {proj && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color }}
                    title={proj.name}
                  />
                )}
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {task.description}
                </span>
              </div>

              <div className="col-span-3 flex items-center space-x-2 pr-3">
                <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 dark:bg-zinc-300 rounded-full"
                    style={{ width: `${Math.max(3, task.percentage)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                  {task.percentage}%
                </span>
              </div>

              <div className="col-span-3 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                {task.hours}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
