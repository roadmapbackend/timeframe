'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, CheckSquare, BarChart3, Play, Square, Plus } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  onToggleTimer: () => void;
  onOpenManual: () => void;
  recentTasks?: { description: string; projectId: string | null }[];
  onStartTask?: (description: string, projectId: string | null) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  isRunning,
  onToggleTimer,
  onOpenManual,
  recentTasks = [],
  onStartTask,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const actions = useMemo(() => {
    const base = [
      {
        id: 'toggle-timer',
        label: isRunning ? 'Stop running timer' : 'Start Deep Work timer',
        shortcut: 'T',
        icon: isRunning ? Square : Play,
        run: () => onToggleTimer(),
      },
      {
        id: 'manual-entry',
        label: 'Log manual / retroactive entry',
        shortcut: 'M',
        icon: Plus,
        run: () => onOpenManual(),
      },
      {
        id: 'nav-ledger',
        label: 'Go to Daily Ledger',
        shortcut: '',
        icon: Clock,
        run: () => router.push('/'),
      },
      {
        id: 'nav-tasks',
        label: 'Go to Tasks & Projects',
        shortcut: '',
        icon: CheckSquare,
        run: () => router.push('/tasks'),
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        shortcut: '',
        icon: BarChart3,
        run: () => router.push('/analytics'),
      },
      ...recentTasks.map((t, i) => ({
        id: `recent-${i}`,
        label: `Resume: ${t.description}`,
        shortcut: '',
        icon: Play,
        run: () => onStartTask?.(t.description, t.projectId),
      })),
    ];

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) => a.label.toLowerCase().includes(q));
  }, [isRunning, onToggleTimer, onOpenManual, router, recentTasks, onStartTask, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/35 backdrop-blur-2xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#202020] border border-zinc-200 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && actions[0]) {
                actions[0].run();
                onClose();
              }
            }}
            placeholder="Type a command or search..."
            className="w-full text-xs bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
          <span className="text-[10px] font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1 rounded">
            ESC
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
          {actions.length === 0 ? (
            <p className="text-xs text-zinc-400 px-2.5 py-4 text-center">
              No matching commands
            </p>
          ) : (
            actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    action.run();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <span className="flex items-center space-x-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </span>
                  {action.shortcut && (
                    <kbd className="text-[10px] font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
