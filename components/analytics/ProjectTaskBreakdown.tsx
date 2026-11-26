'use client';

import React, { useState } from 'react';
import { ProjectDrilldownItem } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProjectTaskBreakdownProps {
  items: ProjectDrilldownItem[];
}

export function ProjectTaskBreakdown({ items }: ProjectTaskBreakdownProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md p-6 text-center">
        <p className="text-xs text-zinc-400">No entries logged in this period.</p>
      </div>
    );
  }

  const toggle = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md overflow-hidden">
      <div className="grid grid-cols-12 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-2.5 bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
        <div className="col-span-6">Project / Task</div>
        <div className="col-span-3">Share</div>
        <div className="col-span-3 text-right">Actual / Est</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {items.map((proj) => {
          const pKey = proj.projectId || '__untagged__';
          const isCollapsed = !!collapsed[pKey];

          return (
            <div key={pKey}>
              {/* Project Row */}
              <button
                type="button"
                onClick={() => toggle(pKey)}
                className="w-full grid grid-cols-12 items-center px-4 py-2.5 text-xs hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 text-left transition-colors"
              >
                <div className="col-span-6 flex items-center space-x-2 pr-3 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color }}
                  />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {proj.name}
                  </span>
                </div>

                <div className="col-span-3 flex items-center space-x-2 pr-3">
                  <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(3, proj.percentage)}%`,
                        backgroundColor: proj.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                    {proj.percentage}%
                  </span>
                </div>

                <div className="col-span-3 text-right font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                  {proj.hours}h
                </div>
              </button>

              {/* Task Drill-down Rows */}
              {!isCollapsed &&
                proj.tasks.map((task) => {
                  const hasEstimate =
                    task.estimateSeconds !== null && task.estimateSeconds > 0;
                  const overrun =
                    hasEstimate && task.seconds > (task.estimateSeconds || 0);

                  return (
                    <div
                      key={task.key}
                      className="grid grid-cols-12 items-center pl-10 pr-4 py-2 text-xs bg-zinc-50/40 dark:bg-zinc-900/20 border-t border-zinc-100/80 dark:border-zinc-800/40"
                    >
                      <div className="col-span-6 pr-3 truncate text-zinc-700 dark:text-zinc-300">
                        {task.title}
                      </div>

                      <div className="col-span-3 flex items-center space-x-2 pr-3">
                        <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full"
                            style={{ width: `${Math.max(2, task.percentage)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                          {task.percentage}%
                        </span>
                      </div>

                      <div className="col-span-3 text-right font-mono tabular-nums text-[11px] text-zinc-600 dark:text-zinc-300">
                        <span>{formatReadableDuration(task.seconds)}</span>
                        {hasEstimate && (
                          <span
                            className={`ml-1 ${
                              overrun ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'
                            }`}
                          >
                            / {formatReadableDuration(task.estimateSeconds!)} est
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
