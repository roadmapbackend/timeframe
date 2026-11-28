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

/* Floating liquid-glass navigation bar with rounded corners. */
export function EditorialNav({
  isCloudConnected,
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
      className="no-print sticky top-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-5xl mt-4 px-5 py-2.5 rounded-2xl border border-foreground/10 bg-card/65 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex flex-wrap items-center justify-between gap-y-2"
    >
      {/* Navigation links */}
      <div className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm md:text-base">
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-1 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${
                isActive
                  ? 'text-foreground font-semibold bg-foreground/8'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right utilities + optional running mini-timer */}
      <div className="flex items-center gap-3">
        {runningLabel && onStopTimer && (
          <button
            type="button"
            onClick={onStopTimer}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-saffron/40 bg-card/80 text-xs md:text-sm font-mono text-foreground hover:border-saffron transition-colors cursor-pointer"
            title={`Stop "${runningLabel}"`}
          >
            <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" aria-hidden="true" />
            <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
            <Square className="w-3 h-3 fill-current text-saffron" aria-hidden="true" />
          </button>
        )}

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
            className="font-mono text-[11px] md:text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
