'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Project, EntrySource } from '@/types';
import { parseDurationInput } from '@/lib/utils';

interface ManualEntryModalProps {
  isOpen: boolean;
  projects: Project[];
  defaultRange?: { startedAt: string; endedAt: string } | null;
  onClose: () => void;
  onSubmit: (entry: {
    description: string;
    projectId?: string | null;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    source?: EntrySource;
  }) => Promise<void>;
}

export function ManualEntryModal({
  isOpen,
  projects,
  defaultRange,
  onClose,
  onSubmit,
}: ManualEntryModalProps) {
  const [description, setDescription] = useState('');
  const [durationStr, setDurationStr] = useState('1h 30m');
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let startedAt: Date;
    let endedAt: Date;
    let durationSeconds: number;

    if (defaultRange) {
      startedAt = new Date(defaultRange.startedAt);
      endedAt = new Date(defaultRange.endedAt);
      durationSeconds = Math.max(
        60,
        Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      );
    } else {
      const parsed = parseDurationInput(durationStr);
      if (!parsed) {
        setError('Enter duration like 1h45, 1:45, 90m, or 1.5');
        return;
      }
      durationSeconds = parsed;
      const todayStr = new Date().toISOString().split('T')[0];
      // "Ended now" by default when logging for today
      endedAt =
        date === todayStr ? new Date() : new Date(`${date}T17:00:00`);
      startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: description.trim() || 'Deep Work',
        projectId: projectId || null,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds,
        source: 'manual',
      });
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#202020] border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl p-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {defaultRange ? 'Fill Untracked Gap' : 'Log Completed Session'}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-500 block mb-1">
              Task Description
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Deep Work, Client Review"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {!defaultRange && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Duration (1h45, 1:45, 90m)
                </label>
                <input
                  type="text"
                  required
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  placeholder="1h 30m"
                  className="w-full text-xs font-mono px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Date (ended now)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-[#202020] focus:outline-none text-zinc-900 dark:text-zinc-100"
              >
                <option value="">No project</option>
                {projects
                  .filter((p) => !p.is_archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {error && <p className="text-[11px] text-rose-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1 text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium hover:opacity-90"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
