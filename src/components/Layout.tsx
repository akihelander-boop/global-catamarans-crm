// ═══════════════════════════════════════════════════════════════
// App Shell — sidebar navigation + top header
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import type { ReactNode, ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types";
import { BrandLogo } from "@/components/BrandLogo";

// ── Icons (inline SVG, no extra deps) ──────────────────────────
const IconDashboard = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconUsers = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IconActivity = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconTasks = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const IconLogout = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const IconMenu = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// ── Logo (brand PNG from /public/brand — same asset family as main site) ──
function GCLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const logoHeight = size === "sm" ? "h-9" : "h-11";
  return (
    <div className="flex flex-col gap-1">
      <BrandLogo variant="onDark" className={`${logoHeight} max-w-[220px]`} />
      <p className="text-[10px] text-expert-border tracking-widest uppercase leading-none font-medium">
        Sales CRM
      </p>
    </div>
  );
}

// ── Nav link ────────────────────────────────────────────────────
function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: () => ReactElement;
  label: string;
}) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${
          active
            ? "bg-white/15 text-primary-foreground"
            : "text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground"
        }`}
    >
      <Icon />
      {label}
    </Link>
  );
}

// ── Sidebar (module-level: avoids “component created during render” lint) ──
function SidebarContent({
  profile,
  isAdmin,
  onCloseMobile,
  onSignOut,
}: {
  profile: Profile | null;
  isAdmin: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-primary-foreground/10">
        <Link to="/" onClick={onCloseMobile}>
          <GCLogo />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-expert-border px-3 pb-1.5">
          Main
        </p>
        <NavItem to="/" icon={IconDashboard} label="Dashboard" />
        <NavItem to="/activity" icon={IconActivity} label="Activity" />
        <NavItem to="/tasks" icon={IconTasks} label="Tasks" />
        <NavItem to="/clients" icon={IconUsers} label="Clients" />

        {isAdmin && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-expert-border px-3 pt-4 pb-1.5">
              Admin
            </p>
            <NavItem to="/team" icon={IconUsers} label="Team" />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-primary-foreground/10">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold shrink-0">
            {(profile?.full_name || profile?.email || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground text-xs font-medium truncate">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-primary-foreground/65 text-[10px] capitalize">
              {profile?.role}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground transition-all"
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Main layout ─────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-primary overflow-hidden">
        <SidebarContent
          profile={profile}
          isAdmin={isAdmin}
          onCloseMobile={() => {}}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-primary flex flex-col z-10">
            <SidebarContent
              profile={profile}
              isAdmin={isAdmin}
              onCloseMobile={closeMobile}
              onSignOut={handleSignOut}
            />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-primary border-b border-primary-foreground/10">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-primary-foreground p-1 rounded hover:bg-white/10"
          >
            <IconMenu />
          </button>
          <GCLogo size="sm" />
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}