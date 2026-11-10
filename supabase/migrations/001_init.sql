-- DSA Tracker — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).

-- 1) Allowlist: only these emails can read/write progress -----------------------------
create table if not exists public.allowed_emails (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
-- No policies on purpose: the table is invisible to clients. Manage it from the dashboard / SQL editor.

-- Helper used by policies: is the signed-in user's email on the allowlist?
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- 2) Progress: one row per (user, problem) ------------------------------------------------
create table if not exists public.progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  problem_key text        not null check (char_length(problem_key) between 1 and 300),
  solved      boolean     not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, problem_key)
);
alter table public.progress enable row level security;

drop policy if exists "own rows: select" on public.progress;
drop policy if exists "own rows: insert" on public.progress;
drop policy if exists "own rows: update" on public.progress;
drop policy if exists "own rows: delete" on public.progress;

create policy "own rows: select" on public.progress
  for select to authenticated
  using (user_id = auth.uid() and public.is_allowed());

create policy "own rows: insert" on public.progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_allowed());

create policy "own rows: update" on public.progress
  for update to authenticated
  using (user_id = auth.uid() and public.is_allowed())
  with check (user_id = auth.uid() and public.is_allowed());

create policy "own rows: delete" on public.progress
  for delete to authenticated
  using (user_id = auth.uid() and public.is_allowed());

-- 3) Lets the app tell a signed-in but not-invited user why they see nothing --------------
create or replace function public.am_i_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_allowed(); $$;
revoke all on function public.am_i_allowed() from public, anon;
grant execute on function public.am_i_allowed() to authenticated;

-- 4) Keep-alive ping (prevents the free project from pausing after ~7 idle days) ---------
create or replace function public.ping()
returns timestamptz
language sql
stable
as $$ select now(); $$;
grant execute on function public.ping() to anon, authenticated;

-- 5) Add yourself (and anyone else you invite) ---------------------------------------------
-- insert into public.allowed_emails (email, note) values ('you@example.com', 'owner')
--   on conflict (email) do nothing;
