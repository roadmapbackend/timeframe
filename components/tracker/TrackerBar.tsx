'use client';

import React, { useState } from 'react';
import { Play, Square, Clock, X } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/lib/utils';
import { ManualEntryModal } from './ManualEntryModal';

interface TrackerBarProps {
  onSaveEntry: (entry: {
    description: string;
    projectId?: string | null;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    isManual: boolean;
  }) => Promise<void>;
}

export function TrackerBar({ onSaveEntry }: TrackerBarProps) {
  const { activeTimer, elapsedSeconds, isRunning, start, stop, discard } = useTimer();
  const [description, setDescription] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const handleToggleTimer = async () => {
    if (isRunning) {
      const entry = stop();
      if (entry) {
        await onSaveEntry(entry);
        setDescription('');
      }
    } else {
      if (!description.trim()) {
        start('Deep Work', null);
      } else {
        start(description.trim(), null);
      }
    }
  };

  const handleManualSubmit = async (data: {
    description: string;
    startedAt: string;
    durationMinutes: number;
  }) => {
    const startedDate = new Date(data.startedAt);
    const durationSeconds = data.durationMinutes * 60;
    const endedDate = new Date(startedDate.getTime() + durationSeconds * 1000);

    await onSaveEntry({
      description: data.description,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationSeconds,
      isManual: true,
    });
  };

  return (
    <>
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md px-3.5 py-2.5 flex items-center justify-between shadow-xs transition-shadow">
        {/* Task Input */}
        <div className="flex items-center flex-1 space-x-2 mr-4">
          <input
            type="text"
            disabled={isRunning}
            placeholder={
              isRunning
                ? activeTimer?.description || 'Deep Work'
                : 'What are you tracking? (e.g. Client Architecture Review, Deep Work...)'
            }
            value={isRunning ? activeTimer?.description || '' : description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRunning) handleToggleTimer();
            }}
            className="w-full text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 bg-transparent focus:outline-none"
          />
        </div>

        {/* Right side: Timer & Actions */}
        <div className="flex items-center space-x-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="font-mono text-xs tabular-nums text-zinc-800 dark:text-zinc-200 min-w-[64px] text-right">
            {formatDuration(elapsedSeconds)}
          </span>

          {isRunning && (
            <button
              onClick={discard}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors"
              title="Discard current timer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleToggleTimer}
            className={`flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isRunning
                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
            title={isRunning ? 'Stop timer & save' : 'Start timer'}
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 fill-current mr-1.5" />
                <span>Stop</span>
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
              title="Add a completed task manually"
            >
              <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Log Manual</span>
            </button>
          )}
        </div>
      </div>

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualSubmit}
      />
    </>
  );
}
