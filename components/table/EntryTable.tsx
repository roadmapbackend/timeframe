'use client';

import React, { useState, useMemo } from 'react';
import { TimeEntry, Project } from '@/types';
import {
  formatReadableDuration,
  formatTimeShort,
  getLocalDayKey,
  parseDurationInput,
} from '@/lib/utils';
import { Trash2, Plus } from 'lucide-react';

interface EntryTableProps {
  entries: TimeEntry[];
  projects: Project[];
  onUpdateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onFillGap: (gap: { startedAt: string; endedAt: string }) => void;
}

interface DayGroup {
  dayKey: string;
  label: string;
  totalSeconds: number;
  items: Array<
    | { kind: 'entry'; entry: TimeEntry }
    | { kind: 'gap'; startedAt: string; endedAt: string; durationSeconds: number }
  >;
}

const MIN_GAP_SECONDS = 15 * 60; // 15m

export function EntryTable({
  entries,
  projects,
  onUpdateEntry,
  onDeleteEntry,
  onFillGap,
}: EntryTableProps) {
  const [editingField, setEditingField] = useState<{
    id: string;
    field: 'description' | 'duration';
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const dayGroups: DayGroup[] = useMemo(() => {
    const groupsMap = new Map<string, TimeEntry[]>();
    entries.forEach((e) => {
      const key = getLocalDayKey(e.started_at);
      const list = groupsMap.get(key) || [];
      list.push(e);
      groupsMap.set(key, list);
    });

    const todayKey = getLocalDayKey(new Date().toISOString());
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayKey = getLocalDayKey(yest.toISOString());

    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) =>
      b.localeCompare(a)
    );

    return sortedKeys.map((dayKey) => {
      const dayEntries = (groupsMap.get(dayKey) || []).sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      const totalSeconds = dayEntries.reduce(
        (sum, e) => sum + (e.duration_seconds || 0),
        0
      );

      let label = new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (dayKey === todayKey) label = 'Today';
      else if (dayKey === yesterdayKey) label = 'Yesterday';

      // Insert untracked gap rows between entries (>= 15 min)
      const items: DayGroup['items'] = [];
      for (let i = 0; i < dayEntries.length; i++) {
        const curr = dayEntries[i];
        items.push({ kind: 'entry', entry: curr });

        const nextOlder = dayEntries[i + 1];
        if (nextOlder && nextOlder.ended_at) {
          const gapEnd = new Date(curr.started_at).getTime();
          const gapStart = new Date(nextOlder.ended_at).getTime();
          const gapSecs = Math.floor((gapEnd - gapStart) / 1000);
          if (gapSecs >= MIN_GAP_SECONDS) {
            items.push({
              kind: 'gap',
              startedAt: nextOlder.ended_at,
              endedAt: curr.started_at,
              durationSeconds: gapSecs,
            });
          }
        }
      }

      return { dayKey, label, totalSeconds, items };
    });
  }, [entries]);

  const startEdit = (
    id: string,
    field: 'description' | 'duration',
    initial: string
  ) => {
    setEditingField({ id, field });
    setEditValue(initial);
  };

  const commitEdit = async (entry: TimeEntry) => {
    if (!editingField || editingField.id !== entry.id) return;

    if (editingField.field === 'description') {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== entry.description) {
        await onUpdateEntry(entry.id, { description: trimmed });
      }
    } else if (editingField.field === 'duration') {
      const parsed = parseDurationInput(editValue);
      if (parsed && parsed !== entry.duration_seconds) {
        const startMs = new Date(entry.started_at).getTime();
        const newEndIso = new Date(startMs + parsed * 1000).toISOString();
        await onUpdateEntry(entry.id, {
          duration_seconds: parsed,
          ended_at: newEndIso,
          source: entry.source === 'timer' ? 'adjusted' : entry.source,
        });
      }
    }
    setEditingField(null);
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md bg-white/50 dark:bg-[#191919]/50">
        <p className="text-xs text-zinc-400">
          No ledger entries yet. Type a task above (e.g.{' '}
          <span className="font-mono text-zinc-600 dark:text-zinc-300">
            Deep work 1h45 #research
          </span>
          ) or press Start.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dayGroups.map((group) => (
        <div
          key={group.dayKey}
          className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-[#191919]"
        >
          {/* Sticky Day Header */}
          <div className="sticky top-11 z-10 flex items-center justify-between px-3.5 py-2 bg-zinc-50/95 dark:bg-[#202020]/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
              {group.label}
            </span>
            <span className="font-mono tabular-nums text-[11px] font-medium text-zinc-500">
              {formatReadableDuration(group.totalSeconds)}
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {group.items.map((item, idx) => {
              if (item.kind === 'gap') {
                return (
                  <button
                    key={`gap-${item.startedAt}-${idx}`}
                    onClick={() =>
                      onFillGap({
                        startedAt: item.startedAt,
                        endedAt: item.endedAt,
                      })
                    }
                    className="w-full flex items-center justify-between px-3.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 border-y border-dashed border-zinc-200/70 dark:border-zinc-800/70 transition-colors text-left"
                  >
                    <span className="flex items-center space-x-1.5 font-mono">
                      <Plus className="w-3 h-3" />
                      <span>
                        {formatTimeShort(item.startedAt)}–
                        {formatTimeShort(item.endedAt)}, untracked
                      </span>
                    </span>
                    <span className="font-mono">
                      +{formatReadableDuration(item.durationSeconds)}
                    </span>
                  </button>
                );
              }

              const { entry } = item;
              const proj = entry.project_id
                ? projectMap.get(entry.project_id)
                : null;
              const isEditingDesc =
                editingField?.id === entry.id &&
                editingField.field === 'description';
              const isEditingDur =
                editingField?.id === entry.id &&
                editingField.field === 'duration';

              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 items-center px-3.5 py-2 text-xs hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                >
                  {/* Title + Project Dot */}
                  <div className="col-span-6 sm:col-span-6 pr-2 flex items-center space-x-2 min-w-0">
                    {proj && (
                      <span
                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0"
                        title={proj.name}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="max-w-[72px] truncate">{proj.name}</span>
                      </span>
                    )}

                    {isEditingDesc ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(entry);
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        onBlur={() => commitEdit(entry)}
                        className="w-full text-xs px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() =>
                          startEdit(entry.id, 'description', entry.description)
                        }
                        className="font-medium text-zinc-800 dark:text-zinc-200 cursor-text truncate"
                        title="Click to edit title"
                      >
                        {entry.description || 'Untitled Task'}
                      </span>
                    )}
                  </div>

                  {/* Time window */}
                  <div className="col-span-3 sm:col-span-2 text-zinc-400 font-mono text-[11px] truncate">
                    {formatTimeShort(entry.started_at)}
                    {entry.ended_at ? `–${formatTimeShort(entry.ended_at)}` : ''}
                  </div>

                  {/* Source */}
                  <div className="hidden sm:block sm:col-span-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
                      {entry.source}
                    </span>
                  </div>

                  {/* Editable Duration + Delete */}
                  <div className="col-span-3 sm:col-span-2 text-right font-mono tabular-nums flex items-center justify-end space-x-1.5">
                    {isEditingDur ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(entry);
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        onBlur={() => commitEdit(entry)}
                        className="w-16 text-right text-xs font-mono px-1 py-0.5 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() =>
                          startEdit(
                            entry.id,
                            'duration',
                            formatReadableDuration(entry.duration_seconds || 0)
                          )
                        }
                        className="text-zinc-800 dark:text-zinc-200 font-medium cursor-text hover:underline decoration-zinc-300"
                        title="Click to edit duration (e.g. 1h45, 1:45, 90m)"
                      >
                        {formatReadableDuration(entry.duration_seconds || 0)}
                      </span>
                    )}

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
      ))}
    </div>
  );
}
