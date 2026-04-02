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
import type { Client, Profile } from '@/types';

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