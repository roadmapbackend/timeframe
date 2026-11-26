'use client';

import React, { useState, useMemo } from 'react';
import { Play, Square, Clock, CornerDownLeft, AlertCircle } from 'lucide-react';
import {
  formatDuration,
  formatReadableDuration,
  parseQuickAddInput,
} from '@/lib/utils';
import { Project, TimeEntry, EntrySource } from '@/types';
import { ManualEntryModal } from './ManualEntryModal';

interface TrackerBarProps {
  projects: Project[];
  runningEntry: TimeEntry | null;
  elapsedSeconds: number;
  isRunning: boolean;
  isManualModalOpen: boolean;
  setIsManualModalOpen: (open: boolean) => void;
  onStartTimer: (description: string, projectId?: string | null) => Promise<void>;
  onStopTimer: (customEndedAt?: Date) => Promise<void>;
  onAddManualEntry: (entry: {
    description: string;
    projectId?: string | null;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    source?: EntrySource;
  }) => Promise<void>;
  onCreateProject: (name: string) => Promise<Project | null>;
}

const FORGOTTEN_THRESHOLD_SECONDS = 4 * 3600; // 4 hours

export function TrackerBar({
  projects,
  runningEntry,
  elapsedSeconds,
  isRunning,
  isManualModalOpen,
  setIsManualModalOpen,
  onStartTimer,
  onStopTimer,
  onAddManualEntry,
  onCreateProject,
}: TrackerBarProps) {
  const [input, setInput] = useState('');

  const parsed = useMemo(
    () => parseQuickAddInput(input, projects),
    [input, projects]
  );

  const isQuickLog = !isRunning && parsed.durationSeconds !== null;
  const isForgotten = isRunning && elapsedSeconds >= FORGOTTEN_THRESHOLD_SECONDS;

  const handleSubmit = async () => {
    if (isRunning) {
      await onStopTimer();
      return;
    }

    let resolvedProjectId = parsed.projectId;
    if (!resolvedProjectId && parsed.projectName) {
      const created = await onCreateProject(parsed.projectName);
      if (created) resolvedProjectId = created.id;
    }

    if (parsed.durationSeconds) {
      // Natural-language manual log: "Ended now" by default
      const endedAt = parsed.endedAt;
      const startedAt = new Date(
        endedAt.getTime() - parsed.durationSeconds * 1000
      );
      await onAddManualEntry({
        description: parsed.description || 'Deep Work',
        projectId: resolvedProjectId,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: parsed.durationSeconds,
        source: 'manual',
      });
      setInput('');
    } else {
      await onStartTimer(parsed.description || 'Deep Work', resolvedProjectId);
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md px-3.5 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center flex-1 space-x-2 mr-3 min-w-0">
          <input
            type="text"
            disabled={isRunning}
            placeholder={
              isRunning
                ? runningEntry?.description || 'Deep Work'
                : 'Quick add or start: "Deep work 1h45 #research yesterday" or just a task...'
            }
            value={isRunning ? runningEntry?.description || '' : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRunning) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 bg-transparent focus:outline-none truncate"
          />

          {/* Live parse preview pill */}
          {!isRunning && input.trim() && (parsed.durationSeconds || parsed.projectName) && (
            <div className="hidden sm:flex items-center space-x-1.5 shrink-0 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {parsed.projectName && <span>#{parsed.projectName}</span>}
              {parsed.durationSeconds && (
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {formatReadableDuration(parsed.durationSeconds)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5 pl-3 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
          {isRunning && (
            <span className="font-mono text-xs tabular-nums text-zinc-800 dark:text-zinc-200 min-w-[60px] text-right">
              {formatDuration(elapsedSeconds)}
            </span>
          )}

          <button
            onClick={handleSubmit}
            className={`flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isRunning
                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90'
            }`}
            title={
              isRunning
                ? 'Stop timer (T)'
                : isQuickLog
                ? 'Log entry now'
                : 'Start timer (T)'
            }
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 fill-current mr-1.5" />
                <span>Stop</span>
              </>
            ) : isQuickLog ? (
              <>
                <CornerDownLeft className="w-3 h-3 mr-1.5" />
                <span>Log {formatReadableDuration(parsed.durationSeconds!)}</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current mr-1.5" />
                <span>Start</span>
              </>
            )}
          </button>

          {!isRunning && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2.5 py-1.5 rounded border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-colors"
              title="Manual entry (M)"
            >
              <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="hidden sm:inline">Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* Forgotten-timer recovery banner */}
      {isForgotten && runningEntry && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Timer has been running for{' '}
              <strong className="font-mono">{formatReadableDuration(elapsedSeconds)}</strong>. Still working?
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onStopTimer(new Date(Date.now() - 2 * 3600 * 1000))}
              className="px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[11px]"
            >
              Stop 2h ago
            </button>
            <button
              onClick={() => onStopTimer()}
              className="px-2 py-0.5 rounded bg-amber-900 text-white dark:bg-amber-200 dark:text-amber-950 text-[11px] font-medium"
            >
              Stop now
            </button>
          </div>
        </div>
      )}

      <ManualEntryModal
        isOpen={isManualModalOpen}
        projects={projects}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={onAddManualEntry}
      />
    </div>
  );
}
