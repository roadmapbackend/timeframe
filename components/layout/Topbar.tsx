'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="h-11 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-zinc-400">Workspace</span>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{title}</span>
      </div>

      <div className="flex items-center space-x-1.5 text-xs text-zinc-500 font-mono">
        <Calendar className="w-3.5 h-3.5" />
        <span>{today}</span>
      </div>
    </header>
  );
}
