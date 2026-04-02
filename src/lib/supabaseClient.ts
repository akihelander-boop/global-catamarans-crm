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
import type {
  Activity,
  ActivityType,
  ActivityWithClient,
  Client,
  CrmReminderChannel,
  CrmTask,
  CrmTaskStatus,
  CrmTaskType,
  CrmTaskWithRelations,
  Profile,
} from '@/types';

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

/** List all profiles (RLS may restrict — see getAssignableProfiles for task assignee picker). */
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  if (error) { console.error('listProfiles:', error); return []; }
  return (data ?? []) as Profile[];
}

/**
 * Users who can receive a task assignment. Uses `profiles`; if that is empty (no rows or RLS),
 * falls back to the signed-in user so the Tasks form always has at least one assignee.
 */
export async function getAssignableProfiles(): Promise<{
  profiles: Profile[];
  usedAuthFallback: boolean;
}> {
  const rows = await listProfiles();
  if (rows.length > 0) return { profiles: rows, usedAuthFallback: false };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { profiles: [], usedAuthFallback: false };

  return {
    profiles: [{
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      role: 'sales',
      created_at: new Date().toISOString(),
    }],
    usedAuthFallback: true,
  };
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

// ── CRM tasks / reminders ───────────────────────────────────────

export type ListCrmTasksScope = 'assigned_to_me' | 'created_by_me' | 'open_all';

export async function listCrmTasks(opts?: {
  scope?: ListCrmTasksScope;
  limit?: number;
  includeDone?: boolean;
}): Promise<CrmTaskWithRelations[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const scope = opts?.scope ?? 'open_all';
  let q = supabase
    .from('crm_tasks')
    .select(`
      *,
      clients ( id, name )
    `)
    .order('due_at', { ascending: true });

  if (scope === 'assigned_to_me') {
    q = q.eq('assigned_to', user.id);
    if (!opts?.includeDone) q = q.eq('status', 'open');
  } else if (scope === 'created_by_me') {
    q = q.eq('created_by', user.id);
    if (!opts?.includeDone) q = q.eq('status', 'open');
  } else {
    q = q.eq('status', 'open');
  }

  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) { console.error('listCrmTasks:', error); return []; }
  return (data ?? []) as CrmTaskWithRelations[];
}

export async function createCrmTask(payload: {
  title: string;
  task_type: CrmTaskType;
  assigned_to: string;
  buyer_id?: string | null;
  due_at: string;
  reminder_channel: CrmReminderChannel;
  whatsapp_phone_e164?: string | null;
  notes?: string | null;
}): Promise<{ task: CrmTask | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    title: payload.title.trim(),
    task_type: payload.task_type,
    assigned_to: payload.assigned_to,
    buyer_id: payload.buyer_id ?? null,
    due_at: payload.due_at,
    reminder_channel: payload.reminder_channel,
    whatsapp_phone_e164:
      payload.reminder_channel === 'whatsapp'
        ? (payload.whatsapp_phone_e164?.trim() || null)
        : null,
    notes: payload.notes?.trim() || null,
    created_by: user?.id ?? null,
    status: 'open' as const,
  };

  const { data, error } = await supabase.from('crm_tasks').insert(row).select().single();

  if (error) {
    console.error('createCrmTask:', error);
    return { task: null, error: error.message };
  }
  return { task: data as CrmTask, error: null };
}

export async function updateCrmTaskStatus(
  id: string,
  status: CrmTaskStatus,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('crm_tasks').update({ status }).eq('id', id);

  if (error) {
    console.error('updateCrmTaskStatus:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function updateCrmTask(
  id: string,
  payload: Partial<{
    title: string;
    task_type: CrmTaskType;
    assigned_to: string;
    buyer_id: string | null;
    due_at: string;
    reminder_channel: CrmReminderChannel;
    whatsapp_phone_e164: string | null;
    notes: string | null;
    status: CrmTaskStatus;
  }>,
): Promise<{ task: CrmTask | null; error: string | null }> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) patch[k] = v;
  }
  if (payload.reminder_channel !== undefined && payload.reminder_channel !== 'whatsapp') {
    patch.whatsapp_phone_e164 = null;
  }

  const { data, error } = await supabase
    .from('crm_tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateCrmTask:', error);
    return { task: null, error: error.message };
  }
  return { task: data as CrmTask, error: null };
}