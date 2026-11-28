'use client';

import React from 'react';
import { Play, Square } from 'lucide-react';
import { Project, Task, TimeEntry } from '@/types';
import { formatDuration, formatReadableDuration } from '@/lib/utils';
import { DayStrip, StripWindow } from './DayStrip';

interface TaskCardProps {
  task: Task;
  project: Project | null;
  sessions: TimeEntry[];
  isRunning: boolean;
  elapsedSeconds: number;
  window: StripWindow;
  nowMs: number;
  onOpen: () => void;
  onResume: () => void;
  onStop: () => void;
}

/* One task on one day: total, session count, when it happened, and resume. */
export function TaskCard({
  task,
  project,
  sessions,
  isRunning,
  elapsedSeconds,
  window,
  nowMs,
  onOpen,
  onResume,
  onStop,
}: TaskCardProps) {
  const completedSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalSeconds = completedSeconds + (isRunning ? elapsedSeconds : 0);
  const count = sessions.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group relative flex flex-col gap-4 rounded-xl border bg-card text-card-foreground p-4 cursor-pointer transition-[box-shadow,border-color] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${
        isRunning ? 'border-saffron/50' : 'border-border hover:border-foreground/20'
      }`}
      style={
        project
          ? {
              borderLeftWidth: '3px',
              borderLeftColor: project.color,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project?.color || 'var(--border)' }}
              aria-hidden="true"
            />
            <h3 className="text-sm font-medium truncate">{task.title}</h3>
          </div>
          <div className="flex items-center gap-2 pl-4 min-w-0">
            {project ? (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono truncate"
                style={{
                  backgroundColor: `color-mix(in oklab, ${project.color} 12%, transparent)`,
                  color: project.color,
                }}
              >
                {project.name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No project</span>
            )}
            {task.priority !== 'medium' && (
              <span className="text-xs text-muted-foreground truncate">
                · {task.priority} priority
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isRunning) onStop();
            else onResume();
          }}
          aria-label={isRunning ? `Stop ${task.title}` : `Resume ${task.title}`}
          title={isRunning ? 'Stop' : 'Resume (adds a new session)'}
          className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full transition-[opacity,background-color] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${
            isRunning
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:bg-saffron hover:text-saffron-foreground'
          }`}
        >
          {isRunning ? (
            <Square className="w-3 h-3 fill-current" aria-hidden="true" />
          ) : (
            <Play className="w-3 h-3 fill-current translate-x-[1px]" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span
            className={`font-mono tabular-nums text-lg ${isRunning ? 'text-saffron' : 'text-foreground'}`}
          >
            {isRunning ? formatDuration(totalSeconds) : formatReadableDuration(totalSeconds)}
          </span>
          <span className="text-xs text-muted-foreground">
            {count === 0 ? 'Not started' : `${count} ${count === 1 ? 'session' : 'sessions'}`}
          </span>
        </div>
        <DayStrip sessions={sessions} window={window} color={project?.color} nowMs={nowMs} />
      </div>
    </div>
  );
}
