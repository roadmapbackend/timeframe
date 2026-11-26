'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setStatus({ type: 'error', message: 'Supabase is not configured in .env.local.' });
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
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setStatus({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191919] px-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="space-y-1.5">
          <div className="w-6 h-6 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-xs font-bold text-white dark:text-zinc-900 mb-3">
            T
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sign in to Timeframe
          </h1>
          <p className="text-xs text-zinc-500">
            Sync your daily ledger and live timer across devices.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 p-0.5 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-100/70 dark:bg-zinc-800/50 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('magic');
              setStatus(null);
            }}
            className={`py-1 rounded transition-colors ${
              mode === 'magic'
                ? 'bg-white dark:bg-[#191919] font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setStatus(null);
            }}
            className={`py-1 rounded transition-colors ${
              mode === 'password'
                ? 'bg-white dark:bg-[#191919] font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Password
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-500 block mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full text-xs pl-8 pr-2.5 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              />
            </div>
          </div>

          {mode === 'password' && (
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-8 pr-2.5 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>
            </div>
          )}

          {status && (
            <div
              className={`text-xs px-2.5 py-2 rounded border ${
                status.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              }`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span>
              {isLoading
                ? 'Working...'
                : mode === 'magic'
                ? 'Send Magic Link'
                : isSignUp
                ? 'Create Account'
                : 'Sign In'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {mode === 'password' && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStatus(null);
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
