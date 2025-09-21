'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('it.manager@example.com');
  const [password, setPassword] = useState('ChangeMe!123');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [variant, setVariant] = useState<'neutral' | 'error' | 'success'>('neutral');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setVariant('neutral');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        setVariant('success');
        setMsg('Signed in. Redirecting…');
        window.location.href = '/dashboard';
      } else {
        const j = await res.json().catch(() => ({}));
        setVariant('error');
        setMsg(j.error || 'Invalid email or password');
      }
    } catch {
      setVariant('error');
      setMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full">
      <div className="mx-auto grid w-full max-w-[28rem] gap-4">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-fuchsia-500 p-[2px]">
            <div className="h-full w-full rounded-[10px] bg-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold leading-tight">Attendance Admin</h1>
            <p className="text-xs text-gray-500">Sign in to manage schedules & approvals</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg backdrop-blur-md"
        >
          <div className="mb-4 space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4 space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-800">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
              >
                {showPw ? (
                  // eye-off
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 3l18 18" />
                    <path d="M10.7 5.1c.43-.07.87-.1 1.3-.1 5.5 0 10 5 10 7- .38 1.78-2.05 3.77-4.41 5.11" />
                    <path d="M6.6 6.6C4.08 8.03 2.38 10 2 12c0 2 4.5 7 10 7 1.63 0 3.18-.38 4.57-1.05" />
                    <path d="M9.9 9.9A3 3 0 0012 15a3 3 0 002.1-.9" />
                  </svg>
                ) : (
                  // eye
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-white transition hover:bg-black disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </button>

          {msg && (
            <p
              className={[
                'mt-3 rounded-md px-3 py-2 text-sm',
                variant === 'error' && 'bg-red-50 text-red-700',
                variant === 'success' && 'bg-green-50 text-green-700',
                variant === 'neutral' && 'bg-gray-50 text-gray-700',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {msg}
            </p>
          )}

          <div className="mt-4 text-center text-xs text-gray-500">
            By signing in, you agree to the company policies.
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">© {new Date().getFullYear()} Attendance Suite</p>
      </div>
    </main>
  );
}
