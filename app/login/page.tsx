'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { palette } from '@/constants/palette';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created. Check your email to confirm, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: palette.background }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black" style={{ color: palette.ink }}>
            LensCal
          </h1>
          <p className="text-sm font-bold" style={{ color: palette.muted }}>
            Softlens care, made calmer.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 flex flex-col gap-4"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.line,
            boxShadow: `0 14px 34px ${palette.softShadow}`,
          }}
        >
          <h2 className="text-lg font-black" style={{ color: palette.ink }}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase" style={{ color: palette.muted }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none"
                style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase" style={{ color: palette.muted }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none"
                style={{ borderColor: palette.line, backgroundColor: palette.surface, color: palette.ink }}
              />
            </div>

            {error && (
              <p
                className="text-sm font-bold rounded-lg px-3 py-2"
                style={{ backgroundColor: palette.dangerBg, color: palette.danger }}
              >
                {error}
              </p>
            )}

            {message && (
              <p
                className="text-sm font-bold rounded-lg px-3 py-2"
                style={{ backgroundColor: palette.surfaceBlue, color: palette.blueDeep }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full py-3 text-sm font-black transition-opacity active:scale-[0.985] disabled:opacity-60"
              style={{ backgroundColor: palette.black, color: palette.white }}
            >
              {isLoading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
              setMessage(null);
            }}
            className="text-sm font-bold text-center"
            style={{ color: palette.muted }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
