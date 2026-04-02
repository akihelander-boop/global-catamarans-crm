-- CRM tasks / reminders: assign to another user, optional client link, due time, channel.
-- In-app: shown in UI. Email/WhatsApp: send via Supabase Edge Function (see supabase/functions/task-reminders).

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.clients(id) on delete set null,
  title text not null,
  task_type text not null,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  due_at timestamptz not null,
  reminder_channel text not null default 'in_app',
  whatsapp_phone_e164 text null,
  reminder_sent_at timestamptz null,
  reminder_last_error text null,
  status text not null default 'open',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tasks_task_type_check check (
    task_type in ('call', 'email', 'message')
  ),
  constraint crm_tasks_reminder_channel_check check (
    reminder_channel in ('in_app', 'email', 'whatsapp')
  ),
  constraint crm_tasks_status_check check (
    status in ('open', 'done', 'cancelled')
  )
);

create index if not exists crm_tasks_assigned_due_idx
  on public.crm_tasks (assigned_to, due_at asc)
  where status = 'open';

create index if not exists crm_tasks_due_pending_idx
  on public.crm_tasks (due_at asc)
  where status = 'open' and reminder_sent_at is null;

create or replace function public.set_crm_tasks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists crm_tasks_set_updated_at on public.crm_tasks;
create trigger crm_tasks_set_updated_at
  before update on public.crm_tasks
  for each row execute procedure public.set_crm_tasks_updated_at();

alter table public.crm_tasks enable row level security;

create policy "crm_tasks_select_authenticated"
  on public.crm_tasks for select
  to authenticated
  using (true);

create policy "crm_tasks_insert_authenticated"
  on public.crm_tasks for insert
  to authenticated
  with check (true);

create policy "crm_tasks_update_authenticated"
  on public.crm_tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "crm_tasks_delete_authenticated"
  on public.crm_tasks for delete
  to authenticated
  using (true);

-- Task assignee picker needs to list team members. If profiles are restricted, add/adjust:
drop policy if exists "profiles_select_team_crm" on public.profiles;
create policy "profiles_select_team_crm"
  on public.profiles for select
  to authenticated
  using (true);
