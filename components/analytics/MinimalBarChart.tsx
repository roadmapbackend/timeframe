'use client';

import React from 'react';
import { AnalyticsSummary } from '@/types';

interface MinimalBarChartProps {
  summary: AnalyticsSummary;
}

export function MinimalBarChart({ summary }: MinimalBarChartProps) {
  if (summary.taskBreakdown.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-6 text-center">
        <p className="text-xs text-zinc-400">No tasks logged in this time range.</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-4">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
        Time Distribution by Task
      </h3>

      <div className="space-y-3">
        {summary.taskBreakdown.map((task) => (
          <div key={task.description} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-4">
                {task.description}
              </span>
              <div className="flex items-center space-x-2 text-zinc-500 font-mono text-[11px] shrink-0">
                <span>{task.hours} hrs</span>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="w-8 text-right">{task.percentage}%</span>
              </div>
            </div>

            {/* Restrained Minimalist Bar */}
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-700 dark:bg-zinc-300 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(3, task.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
