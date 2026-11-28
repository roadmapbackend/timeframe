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

/* Fixed-position Apple/OriginOS-style morphing liquid-glass pill (1s hover linger, zero page shift). */
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
    }, 1000);
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

  // Explicit dimensions so width, height, and border-radius interpolate smoothly
  const pillWidth = isExpanded
    ? isRunning
      ? 'w-[min(94vw,620px)]'
      : 'w-[min(94vw,490px)]'
    : isRunning
    ? 'w-[156px]'
    : 'w-[108px]';

  const pillHeight = isExpanded ? 'h-[48px]' : 'h-[38px]';
  const pillRadius = isExpanded ? 'rounded-[18px]' : 'rounded-[19px]';

  return (
    <>
      {/* Fixed height spacer so the page never shifts when the pill morphs */}
      <div className="no-print h-16 shrink-0" aria-hidden="true" />

      <div className="no-print fixed top-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
        <nav
          aria-label="Primary"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter}
          className={`pointer-events-auto relative overflow-hidden border border-foreground/12 bg-card/70 backdrop-blur-2xl shadow-[0_12px_36px_rgb(0,0,0,0.08)] dark:shadow-[0_12px_36px_rgb(0,0,0,0.45)] transition-[width,height,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${pillWidth} ${pillHeight} ${pillRadius}`}
        >
          {/* Liquid glass top sheen */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/30 to-transparent dark:from-white/10"
          />

          {/* Layer 1: Collapsed pill */}
          <div
            aria-hidden={isExpanded}
            className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isExpanded
                ? 'opacity-0 scale-90 blur-[4px] pointer-events-none'
                : 'opacity-100 scale-100 blur-0'
            }`}
          >
            {isRunning ? (
              <div className="flex items-center gap-2.5 text-xs md:text-sm font-mono text-foreground whitespace-nowrap">
                <span
                  className="w-2 h-2 rounded-full bg-saffron animate-pulse shrink-0"
                  aria-hidden="true"
                />
                <span className="tabular-nums font-medium">
                  {formatDuration(elapsedSeconds)}
                </span>
                <button
                  type="button"
                  tabIndex={isExpanded ? -1 : 0}
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
                tabIndex={isExpanded ? -1 : 0}
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-foreground cursor-pointer px-2 whitespace-nowrap"
              >
                <span
                  className="w-2 h-2 rounded-full bg-saffron shrink-0"
                  aria-hidden="true"
                />
                <span>Tasks</span>
              </button>
            )}
          </div>

          {/* Layer 2: Expanded floating navbar */}
          <div
            aria-hidden={!isExpanded}
            className={`absolute inset-0 flex items-center justify-between px-4 sm:px-5 text-xs sm:text-sm whitespace-nowrap transition-[opacity,transform,filter] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isExpanded
                ? 'opacity-100 scale-100 blur-0 delay-75'
                : 'opacity-0 scale-95 blur-[4px] pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-4">
              {links.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    tabIndex={isExpanded ? 0 : -1}
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

            <div className="flex items-center gap-2.5 sm:gap-3">
              {isRunning && (
                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={onStopTimer}
                  className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-saffron/40 bg-card/80 text-xs font-mono text-foreground hover:border-saffron transition-colors cursor-pointer"
                  title={`Stop "${runningLabel}"`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-saffron animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
                  <Square className="w-2.5 h-2.5 fill-current text-saffron" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                tabIndex={isExpanded ? 0 : -1}
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
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={handleSignOut}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
