'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { TrackerBar } from '@/components/tracker/TrackerBar';
import { EntryTable } from '@/components/table/EntryTable';
import { useTimeEntries } from '@/hooks/useTimeEntries';

export default function DashboardPage() {
  const {
    entries,
    isLoading,
    isCloudConnected,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useTimeEntries();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar isCloudConnected={isCloudConnected} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Time Tracker" />

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
          {/* Top Banner / Heading */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Active Focus & Logging
            </h1>
            <p className="text-xs text-zinc-500">
              Track real-time tasks using the stopwatch or log completed hours manually.
            </p>
          </div>

          {/* Quick Tracking Bar */}
          <TrackerBar onSaveEntry={addEntry} />

          {/* Logged Sessions Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Logged Sessions ({entries.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-8 text-center bg-white dark:bg-[#191919]">
                <p className="text-xs text-zinc-400">Loading your entries...</p>
              </div>
            ) : (
              <EntryTable
                entries={entries}
                onUpdateEntry={updateEntry}
                onDeleteEntry={deleteEntry}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
