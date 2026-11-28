'use client';

import React from 'react';
import { ProjectDrilldownItem } from '@/hooks/useAnalytics';
import { formatReadableDuration } from '@/lib/utils';
import { STUDIO_PALETTE } from '@/lib/constants';

interface ProjectTaskBreakdownProps {
  items: ProjectDrilldownItem[];
}

/* Card-based Project -> Task breakdown with colored accent borders and share bars. */
export function ProjectTaskBreakdown({ items }: ProjectTaskBreakdownProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No entries logged in this period.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((proj, idx) => {
        const pKey = proj.projectId || '__untagged__';
        const accentColor =
          proj.projectId && proj.color !== '#a1a1aa'
            ? proj.color
            : STUDIO_PALETTE[idx % STUDIO_PALETTE.length].hex;

        return (
          <div
            key={pKey}
            className="rounded-xl border border-border bg-card text-card-foreground p-5 space-y-4 shadow-2xs"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: accentColor,
            }}
          >
            {/* Card header: Project name, total hours, and share bar */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {proj.name}
                  </h3>
                </div>
                <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
                  <span className="text-base font-semibold text-foreground">
                    {formatReadableDuration(proj.seconds)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {proj.percentage}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(4, proj.percentage)}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>

            {/* Tasks inside project card */}
            <div className="divide-y divide-border/70 border-t border-border/70 pt-2">
              {proj.tasks.map((task) => {
                const hasEstimate =
                  task.estimateSeconds !== null && task.estimateSeconds > 0;
                const overrun =
                  hasEstimate && task.seconds > (task.estimateSeconds || 0);

                return (
                  <div
                    key={task.key}
                    className="flex items-center justify-between gap-3 py-2 text-xs md:text-sm"
                  >
                    <span className="truncate text-foreground/85">{task.title}</span>
                    <span className="font-mono tabular-nums shrink-0 text-foreground/85">
                      {formatReadableDuration(task.seconds)}
                      {hasEstimate && (
                        <span
                          className={`ml-1.5 ${
                            overrun ? 'text-saffron' : 'text-muted-foreground'
                          }`}
                        >
                          / {formatReadableDuration(task.estimateSeconds!)} est
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
