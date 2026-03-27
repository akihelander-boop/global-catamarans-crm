// ═══════════════════════════════════════════════════════════════
// Auth Context — wraps Supabase Auth session + profile role
// ═══════════════════════════════════════════════════════════════

import {
  createContext, useContext, useEffect, useState, ReactNode
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getMyProfile } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
  session:  Session  | null;
  user:     User     | null;
  profile:  Profile  | null;
  loading:  boolean;
  signIn:   (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:  () => Promise<void>;
  isAdmin:  boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session  | null>(null);
  const [user,     setUser]     = useState<User      | null>(null);
  const [profile,  setProfile]  = useState<Profile   | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Load initial session + subscribe to changes
  useEffect(() => {
    // Get current session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await getMyProfile();
        setProfile(p);
      }
      setLoading(false);
    });

    // Subscribe to future session changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await getMyProfile();
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signIn, signOut,
      isAdmin: profile?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}