'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TimeEntry } from '@/types';
import { formatReadableDuration, formatTimeShort, parseDurationInput } from '@/lib/utils';

interface SplitEntryModalProps {
  entry: TimeEntry | null;
  onClose: () => void;
  onSplit: (entry: TimeEntry, firstSeconds: number) => Promise<void>;
}

/* Split one session into two consecutive sessions of the same task. */
export function SplitEntryModal({ entry, onClose, onSplit }: SplitEntryModalProps) {
  const [firstDurationStr, setFirstDurationStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!entry) return;
    const halfSecs = Math.max(60, Math.floor((entry.duration_seconds || 0) / 2));
    setFirstDurationStr(formatReadableDuration(halfSecs));
    setError(null);
  }, [entry]);

  if (!entry) return null;

  const totalSecs = entry.duration_seconds || 0;
  const parsedFirst = parseDurationInput(firstDurationStr);
  const remainingSecs =
    parsedFirst && parsedFirst > 0 && parsedFirst < totalSecs ? totalSecs - parsedFirst : null;
  const splitAt =
    parsedFirst && remainingSecs
      ? new Date(new Date(entry.started_at).getTime() + parsedFirst * 1000).toISOString()
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedFirst || !remainingSecs) {
      setError(`First part must be under ${formatReadableDuration(totalSecs)}.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSplit(entry, parsedFirst);
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
        className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Split session</h2>
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
            <span className="text-xs text-muted-foreground">
              Length of the first part (of {formatReadableDuration(totalSecs)})
            </span>
            <input
              type="text"
              autoFocus
              value={firstDurationStr}
              onChange={(e) => {
                setFirstDurationStr(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-saffron/40"
            />
          </label>

          <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs font-mono text-muted-foreground space-y-0.5">
            {splitAt && remainingSecs ? (
              <>
                <p>
                  {formatTimeShort(entry.started_at)} – {formatTimeShort(splitAt)} ·{' '}
                  {formatReadableDuration(parsedFirst!)}
                </p>
                <p>
                  {formatTimeShort(splitAt)} – {formatTimeShort(entry.ended_at!)} ·{' '}
                  {formatReadableDuration(remainingSecs)}
                </p>
              </>
            ) : (
              <p>—</p>
            )}
          </div>

          {error && <p className="text-xs text-saffron">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remainingSecs}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-saffron text-saffron-foreground hover:opacity-90 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? 'Splitting…' : 'Split'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
