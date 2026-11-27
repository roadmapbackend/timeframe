'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import { Sun, Moon, Square } from 'lucide-react';

interface EditorialNavProps {
  isCloudConnected: boolean;
  onOpenPalette?: () => void;
  runningLabel?: string | null;
  elapsedSeconds?: number;
  onStopTimer?: () => void;
}

/* Floating editorial navigation bar with omnipresent mini-timer, links, and theme toggle. */
export function EditorialNav({
  isCloudConnected,
  onOpenPalette,
  runningLabel,
  elapsedSeconds = 0,
  onStopTimer,
}: EditorialNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  const links = [
    { label: 'Today', href: '/' },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'Review', href: '/review' },
  ];

  return (
    <nav
      aria-label="Primary"
      className="no-print mx-auto w-full max-w-6xl px-5 sm:px-10 pt-6 pb-4 flex flex-wrap items-center justify-between gap-y-3"
    >
      {/* Brand mark + optional running mini-timer */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          <span
            className="w-2 h-2 rounded-full bg-saffron shrink-0"
            aria-hidden="true"
          />
          <span>Timeframe</span>
        </Link>

        {runningLabel && onStopTimer && (
          <button
            type="button"
            onClick={onStopTimer}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-saffron/40 bg-card text-xs font-mono text-foreground hover:border-saffron transition-colors cursor-pointer"
            title={`Stop "${runningLabel}"`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse" aria-hidden="true" />
            <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
            <Square className="w-2.5 h-2.5 fill-current text-saffron" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Plain text links */}
      <div className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm">
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron ${
                isActive
                  ? 'text-foreground font-semibold underline decoration-saffron decoration-2 underline-offset-8'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right utilities */}
      <div className="flex items-center gap-3">
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
            title="Command palette (⌘K)"
          >
            <span>⌘K</span>
          </button>
        )}

        <span
          className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          title={isCloudConnected ? 'Synced with Supabase' : 'Stored locally'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isCloudConnected ? 'bg-emerald-500' : 'bg-muted-foreground/50'
            }`}
            aria-hidden="true"
          />
          <span>{isCloudConnected ? 'Synced' : 'Local'}</span>
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="relative p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer after:absolute after:-inset-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          {mounted && isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {isCloudConnected && (
          <button
            type="button"
            onClick={handleSignOut}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
