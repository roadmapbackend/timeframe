'use client';

import React, { useState } from 'react';
import { ProjectDrilldownItem } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProjectTaskBreakdownProps {
  items: ProjectDrilldownItem[];
}

/* Hairline-separated Project -> Task drill-down with thin inline bars and estimates. */
export function ProjectTaskBreakdown({ items }: ProjectTaskBreakdownProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="py-12 border-t border-foreground/15 text-center">
        <p className="text-sm text-muted-foreground">No entries logged in this period.</p>
      </div>
    );
  }

  const toggle = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="border-t border-foreground/15">
      <div className="grid grid-cols-12 font-mono text-[11px] md:text-xs uppercase tracking-[0.16em] text-muted-foreground py-3 border-b border-border">
        <div className="col-span-6">Project / Task</div>
        <div className="col-span-3">Share</div>
        <div className="col-span-3 text-right">Actual / Est</div>
      </div>

      <div className="divide-y divide-border">
        {items.map((proj) => {
          const pKey = proj.projectId || '__untagged__';
          const isCollapsed = !!collapsed[pKey];

          return (
            <div key={pKey}>
              <button
                type="button"
                onClick={() => toggle(pKey)}
                className="w-full grid grid-cols-12 items-center py-3.5 pl-3 text-sm md:text-base hover:bg-muted/40 text-left transition-colors cursor-pointer border-l-2"
                style={{ borderLeftColor: proj.color }}
              >
                <div className="col-span-6 flex items-center gap-2.5 pr-3 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-foreground truncate">
                    {proj.name}
                  </span>
                </div>

                <div className="col-span-3 flex items-center gap-2.5 pr-3">
                  <div className="flex-1 h-2 md:h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, proj.percentage)}%`,
                        backgroundColor: proj.color,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground w-9 text-right">
                    {proj.percentage}%
                  </span>
                </div>

                <div className="col-span-3 text-right font-mono tabular-nums font-semibold text-foreground">
                  {proj.hours}h
                </div>
              </button>

              {!isCollapsed &&
                proj.tasks.map((task) => {
                  const hasEstimate =
                    task.estimateSeconds !== null && task.estimateSeconds > 0;
                  const overrun =
                    hasEstimate && task.seconds > (task.estimateSeconds || 0);

                  return (
                    <div
                      key={task.key}
                      className="grid grid-cols-12 items-center pl-9 pr-1 py-3 text-xs md:text-sm bg-muted/25 border-t border-border/60"
                    >
                      <div className="col-span-6 pr-3 truncate text-foreground/85">
                        {task.title}
                      </div>

                      <div className="col-span-3 flex items-center gap-2.5 pr-3">
                        <div className="flex-1 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(3, task.percentage)}%`,
                              backgroundColor: `color-mix(in oklab, ${proj.color} 55%, var(--foreground))`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] md:text-xs text-muted-foreground w-9 text-right">
                          {task.percentage}%
                        </span>
                      </div>

                      <div className="col-span-3 text-right font-mono tabular-nums text-xs md:text-sm text-foreground/85">
                        <span>{formatReadableDuration(task.seconds)}</span>
                        {hasEstimate && (
                          <span
                            className={`ml-1.5 ${
                              overrun ? 'text-saffron' : 'text-muted-foreground'
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
