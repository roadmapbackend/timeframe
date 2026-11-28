'use client';

import React, { useState, useEffect, useRef } from 'react';
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

/* Morphing liquid-glass pill navbar: collapsed to timer/Tasks, expands on hover for 2s. */
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
  const [isExpanded, setIsExpanded] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 2000);
  };

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

  const isRunning = Boolean(runningLabel && onStopTimer);

  return (
    <div className="no-print sticky top-4 z-40 mt-4 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Primary"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        className={`pointer-events-auto relative overflow-hidden border border-foreground/12 bg-card/65 backdrop-blur-2xl shadow-[0_10px_35px_rgb(0,0,0,0.08)] dark:shadow-[0_10px_35px_rgb(0,0,0,0.45)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isExpanded
            ? 'rounded-2xl px-5 py-2.5 scale-100'
            : 'rounded-full px-4 py-2 scale-[0.98] hover:scale-100'
        }`}
      >
        {/* Subtle liquid sheen */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 to-transparent dark:from-white/10"
        />

        {!isExpanded ? (
          /* Collapsed single pill */
          <div className="relative flex items-center justify-center">
            {isRunning ? (
              <div className="flex items-center gap-2.5 text-xs md:text-sm font-mono text-foreground">
                <span
                  className="w-2 h-2 rounded-full bg-saffron animate-pulse shrink-0"
                  aria-hidden="true"
                />
                <span className="tabular-nums font-medium">
                  {formatDuration(elapsedSeconds)}
                </span>
                <button
                  type="button"
                  onClick={onStopTimer}
                  aria-label={`Stop ${runningLabel}`}
                  title={`Stop "${runningLabel}"`}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-saffron text-saffron-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Square className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-foreground cursor-pointer px-1"
              >
                <span
                  className="w-2 h-2 rounded-full bg-saffron shrink-0"
                  aria-hidden="true"
                />
                <span>Tasks</span>
              </button>
            )}
          </div>
        ) : (
          /* Expanded floating navbar */
          <div className="relative flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm md:text-base">
            <div className="flex items-center gap-3 sm:gap-5">
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

            <span className="h-4 w-px bg-foreground/15 hidden sm:block" aria-hidden="true" />

            <div className="flex items-center gap-3">
              {isRunning && (
                <button
                  type="button"
                  onClick={onStopTimer}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-saffron/40 bg-card/80 text-xs md:text-sm font-mono text-foreground hover:border-saffron transition-colors cursor-pointer"
                  title={`Stop "${runningLabel}"`}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-saffron animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
                  <Square className="w-3 h-3 fill-current text-saffron" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to night mode'}
                title={isDark ? 'Light mode' : 'Night mode'}
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
          </div>
        )}
      </nav>
    </div>
  );
}
