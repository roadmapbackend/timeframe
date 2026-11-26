'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { TrackerBar } from '@/components/tracker/TrackerBar';
import { EntryTable } from '@/components/table/EntryTable';
import { ManualEntryModal } from '@/components/tracker/ManualEntryModal';
import { SplitEntryModal } from '@/components/tracker/SplitEntryModal';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { TimeEntry } from '@/types';
import { Play, BarChart3, RotateCcw, Command } from 'lucide-react';

export default function DashboardPage() {
  const {
    entries,
    runningEntry,
    elapsedSeconds,
    isRunning,
    isLoading,
    isCloudConnected,
    startTimer,
    stopTimer,
    addManualEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    splitEntry,
    mergeEntries,
  } = useTimeEntries();

  const { projects, createProject } = useProjects();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<TimeEntry | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTrigger, setEditTrigger] = useState<{ id: string; nonce: number } | null>(
    null
  );
  const [gapRange, setGapRange] = useState<{
    startedAt: string;
    endedAt: string;
  } | null>(null);
  const [undoEntry, setUndoEntry] = useState<TimeEntry | null>(null);

  // Global keyboard shortcuts: ⌘K palette, T timer, M manual, ↑/↓ select row, E edit row
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 't') {
        e.preventDefault();
        if (isRunning) stopTimer();
        else startTimer('Deep Work', null);
      } else if (key === 'm') {
        e.preventDefault();
        setIsManualModalOpen(true);
      } else if (e.key === 'ArrowDown' || key === 'j') {
        if (entries.length === 0) return;
        e.preventDefault();
        const idx = entries.findIndex((item) => item.id === selectedId);
        const nextIdx = idx < 0 ? 0 : Math.min(entries.length - 1, idx + 1);
        setSelectedId(entries[nextIdx].id);
      } else if (e.key === 'ArrowUp' || key === 'k') {
        if (entries.length === 0) return;
        e.preventDefault();
        const idx = entries.findIndex((item) => item.id === selectedId);
        const prevIdx = idx <= 0 ? 0 : idx - 1;
        setSelectedId(entries[prevIdx].id);
      } else if (key === 'e' && selectedId) {
        e.preventDefault();
        setEditTrigger({ id: selectedId, nonce: Date.now() });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, startTimer, stopTimer, entries, selectedId]);

  const recentTasks = useMemo(() => {
    const seen = new Set<string>();
    const list: { description: string; projectId: string | null }[] = [];
    for (const e of entries) {
      const desc = e.description.trim();
      if (!desc || seen.has(desc.toLowerCase())) continue;
      seen.add(desc.toLowerCase());
      list.push({ description: desc, projectId: e.project_id });
      if (list.length >= 4) break;
    }
    return list;
  }, [entries]);

  const handleDelete = async (id: string) => {
    const deleted = await deleteEntry(id);
    if (deleted) {
      setUndoEntry(deleted);
      setTimeout(() => {
        setUndoEntry((curr) => (curr?.id === deleted.id ? null : curr));
      }, 5000);
    }
  };

  const handleUndo = async () => {
    if (!undoEntry) return;
    await restoreEntry(undoEntry);
    setUndoEntry(null);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isCloudConnected={isCloudConnected} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Daily Ledger" />

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-5">
          {/* Mobile header nav */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Timeframe
            </span>
            <div className="flex items-center space-x-1.5">
              <Link
                href="/tasks"
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded"
              >
                Tasks
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </Link>
              <Link
                href="/review"
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded"
              >
                Review
              </Link>
            </div>
          </div>

          <TrackerBar
            projects={projects}
            runningEntry={runningEntry}
            elapsedSeconds={elapsedSeconds}
            isRunning={isRunning}
            isManualModalOpen={isManualModalOpen}
            setIsManualModalOpen={setIsManualModalOpen}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
            onAddManualEntry={addManualEntry}
            onCreateProject={createProject}
          />

          {/* Quick-resume recent tasks + keyboard hint */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {!isRunning && recentTasks.length > 0 ? (
              <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                <span className="text-zinc-400 mr-1">Resume:</span>
                {recentTasks.map((t) => (
                  <button
                    key={t.description}
                    onClick={() => startTimer(t.description, t.projectId)}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Play className="w-2.5 h-2.5 fill-current text-zinc-400" />
                    <span className="max-w-[140px] truncate">{t.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div />
            )}

            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Open command palette (⌘K)"
            >
              <Command className="w-3 h-3" />
              <span>K palette · T timer · M manual · E edit</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {isLoading ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-8 text-center bg-white dark:bg-[#191919]">
                <p className="text-xs text-zinc-400">Loading ledger...</p>
              </div>
            ) : (
              <EntryTable
                entries={entries}
                projects={projects}
                selectedId={selectedId}
                editTrigger={editTrigger}
                onSelectEntry={setSelectedId}
                onUpdateEntry={updateEntry}
                onDeleteEntry={handleDelete}
                onFillGap={(gap) => setGapRange(gap)}
                onSplitEntry={(entry) => setSplitTarget(entry)}
                onMergeEntries={mergeEntries}
                onCreateProject={createProject}
              />
            )}
          </div>
        </main>
      </div>

      {/* Gap-fill modal */}
      <ManualEntryModal
        isOpen={!!gapRange}
        projects={projects}
        defaultRange={gapRange}
        onClose={() => setGapRange(null)}
        onSubmit={addManualEntry}
      />

      {/* Split entry modal */}
      <SplitEntryModal
        entry={splitTarget}
        onClose={() => setSplitTarget(null)}
        onSplit={splitEntry}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        isRunning={isRunning}
        onToggleTimer={() => (isRunning ? stopTimer() : startTimer('Deep Work', null))}
        onOpenManual={() => setIsManualModalOpen(true)}
        recentTasks={recentTasks}
        onStartTask={(desc, pid) => startTimer(desc, pid)}
      />

      {/* Undo toast */}
      {undoEntry && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-3 px-3.5 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs shadow-lg">
          <span>Entry deleted</span>
          <button
            onClick={handleUndo}
            className="inline-flex items-center space-x-1 font-medium underline underline-offset-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>
      )}
    </div>
  );
}
