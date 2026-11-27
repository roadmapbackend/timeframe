'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, CheckSquare, BarChart3, FileText, Play, Square, Plus } from 'lucide-react';
import { Task } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  onToggleTimer: () => void;
  onOpenManual: () => void;
  recentTasks?: Task[];
  onResumeTask?: (task: Task) => void;
}

/* Global ⌘K command palette using semantic light/dark card tokens. */
export function CommandPalette({
  isOpen,
  onClose,
  isRunning,
  onToggleTimer,
  onOpenManual,
  recentTasks = [],
  onResumeTask,
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
        label: isRunning ? 'Stop running timer' : 'Start an untitled timer',
        shortcut: 'T',
        icon: isRunning ? Square : Play,
        run: () => onToggleTimer(),
      },
      {
        id: 'manual-entry',
        label: 'Log completed work manually',
        shortcut: 'M',
        icon: Plus,
        run: () => onOpenManual(),
      },
      {
        id: 'nav-ledger',
        label: 'Go to Today',
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
      {
        id: 'nav-review',
        label: 'Go to Weekly Review',
        shortcut: '',
        icon: FileText,
        run: () => router.push('/review'),
      },
      ...recentTasks.map((t) => ({
        id: `resume-${t.id}`,
        label: `Resume: ${t.title}`,
        shortcut: '',
        icon: Play,
        run: () => onResumeTask?.(t),
      })),
    ];

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) => a.label.toLowerCase().includes(q));
  }, [isRunning, onToggleTimer, onOpenManual, router, recentTasks, onResumeTask, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-card text-card-foreground border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5 shrink-0" aria-hidden="true" />
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
            placeholder="Type a command..."
            className="w-full text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
          {actions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-5 text-center">
              No matching commands.
            </p>
          ) : (
            actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.run();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-xs text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="truncate">{action.label}</span>
                  </span>
                  {action.shortcut && (
                    <kbd className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
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
