'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TimeEntry } from '@/types';
import { formatReadableDuration, parseDurationInput } from '@/lib/utils';

interface SplitEntryModalProps {
  entry: TimeEntry | null;
  onClose: () => void;
  onSplit: (
    entry: TimeEntry,
    firstSeconds: number,
    firstDesc: string,
    secondDesc: string
  ) => Promise<void>;
}

export function SplitEntryModal({ entry, onClose, onSplit }: SplitEntryModalProps) {
  const [firstDurationStr, setFirstDurationStr] = useState('');
  const [firstDesc, setFirstDesc] = useState('');
  const [secondDesc, setSecondDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!entry) return;
    const halfSecs = Math.max(60, Math.floor((entry.duration_seconds || 0) / 2));
    setFirstDurationStr(formatReadableDuration(halfSecs));
    setFirstDesc(entry.description);
    setSecondDesc(entry.description);
    setError(null);
  }, [entry]);

  if (!entry) return null;

  const totalSecs = entry.duration_seconds || 0;
  const parsedFirst = parseDurationInput(firstDurationStr);
  const remainingSecs =
    parsedFirst && parsedFirst > 0 && parsedFirst < totalSecs
      ? totalSecs - parsedFirst
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedFirst || parsedFirst <= 0 || parsedFirst >= totalSecs) {
      setError(`First part must be less than ${formatReadableDuration(totalSecs)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSplit(entry, parsedFirst, firstDesc, secondDesc);
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
            Split Entry ({formatReadableDuration(totalSecs)})
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Part A Title
              </label>
              <input
                type="text"
                required
                value={firstDesc}
                onChange={(e) => setFirstDesc(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Part A Dur
              </label>
              <input
                type="text"
                required
                autoFocus
                value={firstDurationStr}
                onChange={(e) => setFirstDurationStr(e.target.value)}
                className="w-full text-xs font-mono px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Part B Title
              </label>
              <input
                type="text"
                required
                value={secondDesc}
                onChange={(e) => setSecondDesc(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Part B Dur
              </label>
              <div className="text-xs font-mono px-2 py-1.5 border border-zinc-100 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500">
                {remainingSecs ? formatReadableDuration(remainingSecs) : '—'}
              </div>
            </div>
          </div>

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
              disabled={isSubmitting || !remainingSecs}
              className="px-3.5 py-1 text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium hover:opacity-90 disabled:opacity-40"
            >
              {isSubmitting ? 'Splitting...' : 'Split Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
