-- Activity timeline for clients (buyers). Run in Supabase SQL editor if not using CLI migrations.
-- buyer_id → public.clients(id)

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  note text,
  buyer_id uuid not null references public.clients(id) on delete cascade,
  boat_id uuid null,
  user_id uuid null references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint activities_type_check check (
    type in (
      'call', 'email', 'linkedin', 'whatsapp',
      'viewing', 'offer', 'contract',
      'website_visit', 'note', 'other'
    )
  )
);

create index if not exists activities_buyer_occurred_idx
  on public.activities (buyer_id, occurred_at desc);

alter table public.activities enable row level security;

-- Internal CRM: any authenticated user can read/write (tighten per org later)
create policy "activities_select_authenticated"
  on public.activities for select
  to authenticated
  using (true);

create policy "activities_insert_authenticated"
  on public.activities for insert
  to authenticated
  with check (true);

create policy "activities_update_authenticated"
  on public.activities for update
  to authenticated
  using (true)
  with check (true);

create policy "activities_delete_authenticated"
  on public.activities for delete
  to authenticated
  using (true);
