// ═══════════════════════════════════════════════════════════════
// App Shell — sidebar navigation + top header
// ═══════════════════════════════════════════════════════════════

import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Icons (inline SVG, no extra deps) ──────────────────────────
const IconDashboard = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);
const IconMenu = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
);

// ── Logo ────────────────────────────────────────────────────────
function GCLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={`flex items-center gap-2 ${size === 'sm' ? 'gap-1.5' : ''}`}>
      <svg
        viewBox="0 0 40 40"
        className={size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'}
        fill="none"
        aria-hidden
      >
        <path d="M20 4L6 34l14-4 14 4Z" fill="#00a8cc" fillOpacity=".9"/>
        <path d="M11 34Q20 38 29 34" stroke="#00a8cc" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M3 37 L37 37" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".6"/>
      </svg>
      <div>
        <p className={`font-bold text-white leading-none ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
          Global Catamarans
        </p>
        <p className="text-[10px] text-blue-300 tracking-widest uppercase leading-none mt-0.5">
          Sales CRM
        </p>
      </div>
    </div>
  );
}

// ── Nav link ────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label }: { to: string; icon: () => JSX.Element; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${active
          ? 'bg-white/15 text-white'
          : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon />
      {label}
    </Link>
  );
}

// ── Main layout ─────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link to="/" onClick={() => setMobileOpen(false)}>
          <GCLogo />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 px-3 pb-1.5">
          Main
        </p>
        <NavItem to="/"        icon={IconDashboard} label="Dashboard" />
        <NavItem to="/clients" icon={IconUsers}     label="Clients" />

        {isAdmin && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 px-3 pt-4 pb-1.5">
              Admin
            </p>
            <NavItem to="/team" icon={IconUsers} label="Team" />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[#00a8cc] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-blue-300 text-[10px] capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4fa]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#1a3a6b] overflow-hidden">
        <SidebarInner />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#1a3a6b] flex flex-col z-10">
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1a3a6b] border-b border-white/10">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white p-1 rounded hover:bg-white/10"
          >
            <IconMenu />
          </button>
          <GCLogo size="sm" />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}