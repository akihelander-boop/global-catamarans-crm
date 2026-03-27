// ═══════════════════════════════════════════════════════════════
// Login Page
// ═══════════════════════════════════════════════════════════════

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d2a56] via-[#1a4080] to-[#0a7fa0]" />

      {/* Wave decoration */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 100'%3E%3Cpath d='M0 50Q150 10 300 50Q450 90 600 50Q750 10 900 50Q1050 90 1200 50L1200 100L0 100Z' fill='white'/%3E%3C/svg%3E")`,
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-1">
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" aria-label="Global Catamarans">
              <path d="M24 4L8 40l16-5 16 5Z" fill="#00a8cc" fillOpacity=".95"/>
              <path d="M13 40Q24 45 35 40" stroke="#00a8cc" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M3 44L45 44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".4"/>
            </svg>
            <div className="text-left">
              <p className="text-white font-bold text-xl leading-tight">Global Catamarans</p>
              <p className="text-blue-300 text-xs tracking-widest uppercase">CRM · Internal</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-[#1a3a6b] font-bold text-lg mb-1">Sign in</h1>
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
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#2c5aa0]/30 focus:border-[#2c5aa0]
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
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#2c5aa0]/30 focus:border-[#2c5aa0]
                           disabled:opacity-60 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#2c5aa0] hover:bg-[#1a4080] active:scale-[.98]
                         text-white font-semibold text-sm transition-all disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Need access? Contact your admin to create an account.
          </p>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          © {new Date().getFullYear()} Global Catamarans · Internal use only
        </p>
      </div>
    </div>
  );
}