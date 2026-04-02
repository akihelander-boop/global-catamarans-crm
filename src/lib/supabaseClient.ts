// ═══════════════════════════════════════════════════════════════
// Global Catamarans CRM — Supabase Client
//
// Compatible with:
//   - Web (this app)
//   - React Native (use @supabase/supabase-js with AsyncStorage)
//   - Flutter (use supabase_flutter package)
//
// Environment variables required in .env.local:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import type { Activity, ActivityType, ActivityWithClient, Client, Profile } from '@/types';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

// The typed database client — add more tables to the generic as needed
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist sessions in localStorage (web). 
    // For React Native swap to AsyncStorage — see Supabase docs.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Typed query helpers ────────────────────────────────────────

/** Fetch the profile row for the currently logged-in user */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) { console.error('getMyProfile:', error); return null; }
  return data as Profile;
}

/** List clients with optional search + filter */
export async function listClients(opts?: {
  search?: string;
  potentialScore?: number;
  customerType?: string;
}): Promise<Client[]> {
  let query = supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false });

  if (opts?.potentialScore != null) {
    query = query.eq('potential_score', opts.potentialScore);
  }
  if (opts?.customerType && opts.customerType !== 'all') {
    query = query.eq('customer_type', opts.customerType);
  }
  // Supabase full-text-style search across name + email
  if (opts?.search) {
    query = query.or(
      `name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`
    );
  }

  const { data, error } = await query;
  if (error) { console.error('listClients:', error); return []; }
  return (data ?? []) as Client[];
}

/** Get a single client by id */
export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) { console.error('getClient:', error); return null; }
  return data as Client;
}

/** Create a new client */
export async function createClient_(payload: Omit<Partial<Client>, 'id' | 'created_at' | 'updated_at'> & { name: string }): Promise<Client | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...payload, created_by: user?.id ?? null })
    .select()
    .single();

  if (error) { console.error('createClient:', error); return null; }
  return data as Client;
}

/** Update an existing client */
export async function updateClient(id: string, payload: Partial<Client>): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('updateClient:', error); return null; }
  return data as Client;
}

/** Delete a client (admin only — enforced by RLS) */
export async function deleteClient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) { console.error('deleteClient:', error); return false; }
  return true;
}

/** List all profiles (admin only — enforced by RLS) */
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  if (error) { console.error('listProfiles:', error); return []; }
  return (data ?? []) as Profile[];
}

/** Profiles for a set of user ids (timeline authors). */
export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', unique);

  if (error) { console.error('getProfilesByIds:', error); return []; }
  return (data ?? []) as Profile[];
}

/** Activity timeline for one client (`buyer_id` = `clients.id`). */
export async function listActivitiesForBuyer(buyerId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('occurred_at', { ascending: false });

  if (error) { console.error('listActivitiesForBuyer:', error); return []; }
  return (data ?? []) as Activity[];
}

/** All recent activities across clients (newest first), with client name for display. */
export async function listRecentActivitiesGlobal(limit = 100): Promise<ActivityWithClient[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      clients (
        id,
        name
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('listRecentActivitiesGlobal:', error); return []; }
  return (data ?? []) as ActivityWithClient[];
}

export async function createActivity(payload: {
  type: ActivityType;
  note?: string | null;
  buyer_id: string;
  boat_id?: string | null;
  /** ISO string; defaults to now on server */
  occurred_at?: string;
}): Promise<{ activity: Activity | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    type: payload.type,
    note: payload.note ?? null,
    buyer_id: payload.buyer_id,
    boat_id: payload.boat_id ?? null,
    user_id: user?.id ?? null,
    ...(payload.occurred_at ? { occurred_at: payload.occurred_at } : {}),
  };

  const { data, error } = await supabase
    .from('activities')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('createActivity:', error);
    return { activity: null, error: error.message };
  }
  return { activity: data as Activity, error: null };
}