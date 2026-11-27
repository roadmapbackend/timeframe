'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Project, EntrySource } from '@/types';
import { dayAt, formatReadableDuration, formatTimeShort, parseDurationInput, todayKey } from '@/lib/utils';

interface ManualEntryModalProps {
  isOpen: boolean;
  projects: Project[];
  /** Existing task names, suggested while typing */
  taskTitles?: string[];
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

const fieldClass =
  'w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-saffron/40';

/* Log a finished session, or fill an untracked gap. */
export function ManualEntryModal({
  isOpen,
  projects,
  taskTitles = [],
  defaultRange,
  onClose,
  onSubmit,
}: ManualEntryModalProps) {
  const [description, setDescription] = useState('');
  const [durationStr, setDurationStr] = useState('1h 30m');
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState(todayKey);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(todayKey());
      setError(null);
    }
  }, [isOpen]);

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
      durationSeconds = Math.max(60, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    } else {
      const parsed = parseDurationInput(durationStr);
      if (!parsed) {
        setError('Use formats like 1h45, 1:45, 90m, or 1.5.');
        return;
      }
      durationSeconds = parsed;
      endedAt = date === todayKey() ? new Date() : dayAt(date, 17);
      startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {defaultRange
              ? `Fill ${formatTimeShort(defaultRange.startedAt)} – ${formatTimeShort(defaultRange.endedAt)} · ${formatReadableDuration(
                  (new Date(defaultRange.endedAt).getTime() - new Date(defaultRange.startedAt).getTime()) / 1000
                )}`
              : 'Log finished work'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Task</span>
            <input
              type="text"
              autoFocus
              list="task-title-options"
              placeholder="Leave empty for Untitled"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClass}
            />
            <datalist id="task-title-options">
              {taskTitles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          {!defaultRange && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">Duration</span>
                <input
                  type="text"
                  required
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  placeholder="1h 30m"
                  className={`${fieldClass} font-mono`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">Day</span>
                <input
                  type="date"
                  value={date}
                  max={todayKey()}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          {projects.length > 0 && (
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">Project (for a new task)</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`${fieldClass} cursor-pointer`}
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
            </label>
          )}

          {error && <p className="text-xs text-saffron">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-saffron text-saffron-foreground hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
