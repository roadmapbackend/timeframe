'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setStatus({ type: 'error', message: 'Supabase keys are not configured yet.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setStatus({
          type: 'success',
          message: 'Check your email for the sign-in link.',
        });
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setStatus({
          type: 'success',
          message: 'Account created. Check your email if confirmation is enabled.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const friendly = raw.includes('Invalid login credentials')
        ? "That email and password don't match."
        : raw || 'Something went wrong. Try again.';
      setStatus({ type: 'error', message: friendly });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground px-5">
      <div className="mx-auto w-full max-w-6xl pt-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-display text-base font-semibold">
          <span className="w-2 h-2 rounded-full bg-saffron" aria-hidden="true" />
          <span>Timeframe</span>
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground block">
              ( Sign in )
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.03em] leading-[1.05]">
              Keep your{' '}
              <span className="font-serif italic font-normal text-saffron">
                ledger
              </span>{' '}
              in sync.
            </h1>
            <p className="text-sm text-muted-foreground">
              Your timer and entries follow you across phone and desktop.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-full border border-border bg-card text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('magic');
                setStatus(null);
              }}
              className={`px-3.5 py-1 rounded-full transition-colors cursor-pointer ${
                mode === 'magic'
                  ? 'bg-saffron text-saffron-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Magic link
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setStatus(null);
              }}
              className={`px-3.5 py-1 rounded-full transition-colors cursor-pointer ${
                mode === 'password'
                  ? 'bg-saffron text-saffron-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Password
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground block mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full text-sm py-2 border-b-2 border-foreground/20 focus:border-saffron bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm py-2 border-b-2 border-foreground/20 focus:border-saffron bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
            )}

            {status && (
              <div
                className={`text-xs px-3 py-2.5 rounded border ${
                  status.type === 'error'
                    ? 'border-saffron/50 bg-saffron/10 text-foreground'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                }`}
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-medium bg-saffron text-saffron-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <span>
                {isLoading
                  ? 'Working...'
                  : mode === 'magic'
                  ? 'Send magic link'
                  : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>

          {mode === 'password' && (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStatus(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
