'use client';

import React, { useState } from 'react';
import { TimeEntry } from '@/types';
import { formatReadableDuration } from '@/lib/utils';
import { Trash2, Check } from 'lucide-react';

interface EntryTableProps {
  entries: TimeEntry[];
  onUpdateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export function EntryTable({ entries, onUpdateEntry, onDeleteEntry }: EntryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditValue(entry.description);
  };

  const saveEdit = async (id: string) => {
    if (editingId === id && editValue.trim()) {
      await onUpdateEntry(id, { description: editValue.trim() });
    }
    setEditingId(null);
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md bg-white/50 dark:bg-[#191919]/50">
        <p className="text-xs text-zinc-400">
          No time logged yet. Press <span className="font-semibold text-zinc-600 dark:text-zinc-300">Start</span> above or log a task manually.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-[#191919]">
      {/* Header Row */}
      <div className="grid grid-cols-12 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3.5 py-2 bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800 select-none">
        <div className="col-span-6">Task Description</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Mode</div>
        <div className="col-span-2 text-right">Duration</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id;
          const entryDate = new Date(entry.started_at);
          const formattedDate = entryDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={entry.id}
              className="grid grid-cols-12 items-center px-3.5 py-2 text-xs hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
            >
              {/* Inline Description Edit */}
              <div className="col-span-6 pr-2">
                {isEditing ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(entry.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => saveEdit(entry.id)}
                      className="w-full text-xs px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={() => saveEdit(entry.id)}
                      className="p-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => startEdit(entry)}
                    className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white cursor-text block truncate"
                    title="Click to edit task description"
                  >
                    {entry.description || 'Untitled Task'}
                  </span>
                )}
              </div>

              {/* Date */}
              <div className="col-span-2 text-zinc-500 font-mono text-[11px]">
                {formattedDate}
              </div>

              {/* Tracking Mode Badge */}
              <div className="col-span-2">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    entry.is_manual
                      ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}
                >
                  {entry.is_manual ? 'Manual' : 'Stopwatch'}
                </span>
              </div>

              {/* Duration and Actions */}
              <div className="col-span-2 text-right font-mono tabular-nums flex items-center justify-end space-x-2">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  {formatReadableDuration(entry.duration_seconds)}
                </span>

                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity rounded"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
