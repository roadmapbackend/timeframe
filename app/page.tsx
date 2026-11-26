'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { TrackerBar } from '@/components/tracker/TrackerBar';
import { EntryTable } from '@/components/table/EntryTable';
import { ManualEntryModal } from '@/components/tracker/ManualEntryModal';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { TimeEntry } from '@/types';
import { Play, BarChart3, RotateCcw } from 'lucide-react';

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
  } = useTimeEntries();

  const { projects, createProject } = useProjects();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [gapRange, setGapRange] = useState<{
    startedAt: string;
    endedAt: string;
  } | null>(null);
  const [undoEntry, setUndoEntry] = useState<TimeEntry | null>(null);

  // Keyboard shortcuts when not focused in an input: T = toggle timer, M = manual modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (isRunning) stopTimer();
        else startTimer('Deep Work', null);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsManualModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, startTimer, stopTimer]);

  // Recent unique task titles for quick 1-click resume
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
            <Link
              href="/analytics"
              className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>
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

          {/* Quick-resume recent tasks */}
          {!isRunning && recentTasks.length > 0 && (
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
          )}

          <div className="space-y-3 pt-1">
            {isLoading ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-8 text-center bg-white dark:bg-[#191919]">
                <p className="text-xs text-zinc-400">Loading ledger...</p>
              </div>
            ) : (
              <EntryTable
                entries={entries}
                projects={projects}
                onUpdateEntry={updateEntry}
                onDeleteEntry={handleDelete}
                onFillGap={(gap) => setGapRange(gap)}
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
