-- If you already ran the first migration with user_id → profiles(id), inserts fail
-- when the signed-in user has no profiles row. Re-point FK to auth.users.

alter table public.activities drop constraint if exists activities_user_id_fkey;

alter table public.activities
  add constraint activities_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
