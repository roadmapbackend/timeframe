'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, BarChart3, Database, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  isCloudConnected: boolean;
}

export function Sidebar({ isCloudConnected }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Time Tracker', href: '/', icon: Clock },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-[#f7f7f5] dark:bg-[#202020] min-h-screen flex flex-col justify-between select-none">
      <div className="p-3">
        {/* Workspace Brand / Header */}
        <div className="flex items-center space-x-2 px-2 py-1.5 mb-4 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
          <div className="w-4 h-4 rounded-xs bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center text-[10px] text-white dark:text-zinc-900 font-bold">
            T
          </div>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            Time Workspace
          </span>
        </div>

        {/* Navigation Section */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cloud Sync Status Indicator */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-500">
          <div className="flex items-center space-x-1.5">
            {isCloudConnected ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Database className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>{isCloudConnected ? 'Cloud Synced' : 'Local Storage'}</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isCloudConnected ? 'bg-emerald-500' : 'bg-zinc-400'
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
