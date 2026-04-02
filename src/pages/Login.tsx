// ═══════════════════════════════════════════════════════════════
// Login Page
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';

export default function Login() {
  const { signIn, session, loading } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [submitting, setSubmitting]  = useState(false);

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [loading, session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-[hsl(206_66%_24%)] to-accent" />

      {/* Wave decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 100'%3E%3Cpath d='M0 50Q150 10 300 50Q450 90 600 50Q750 10 900 50Q1050 90 1200 50L1200 100L0 100Z' fill='white'/%3E%3C/svg%3E")`,
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">

        {/* Logo — same family as globalcatamarans.com */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-2">
            <BrandLogo variant="onDark" className="h-14 sm:h-16 max-w-[280px] mx-auto" />
            <p className="text-primary-foreground/80 text-xs tracking-widest uppercase font-medium">
              CRM · Internal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-card-foreground font-bold text-lg mb-1">Sign in</h1>
          <p className="text-gray-500 text-sm mb-6">Access the client management dashboard</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@globalcatamarans.com"
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring
                           disabled:opacity-60 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring
                           disabled:opacity-60 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 active:scale-[.98]
                         text-primary-foreground font-semibold text-sm transition-all disabled:opacity-60 mt-2"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Need access? Contact your admin to create an account.
          </p>
        </div>

        <p className="text-center text-primary-foreground/45 text-xs mt-6">
          © {new Date().getFullYear()} Global Catamarans · Internal use only
        </p>
      </div>
    </div>
  );
}