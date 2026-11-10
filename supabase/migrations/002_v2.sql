-- DSA Tracker — migration 002 (v2): versions, solution links, revisit flags, notes.
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: safe to re-run. Requires 001_init.sql to have been applied.
-- Existing progress is kept: each user's rows move into a version named "Version 1",
-- and rows already solved without a link are flagged needs_link = true (shown as "add link" in the app).

begin;

-- 0) Tighten 001: anonymous callers can't execute the allowlist helpers ---------------------
revoke all on function public.is_allowed()   from public, anon;
revoke all on function public.am_i_allowed() from public, anon;
grant execute on function public.is_allowed()   to authenticated;
grant execute on function public.am_i_allowed() to authenticated;

-- 1) Versions: up to 5 separate tracking rounds per user ----------------------------------
create table if not exists public.tracker_versions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  constraint tracker_versions_user_name_key unique (user_id, name),
  -- lets progress reference (version, owner) together, so a row can never point at someone else's version
  constraint tracker_versions_id_user_key unique (id, user_id)
);
alter table public.tracker_versions enable row level security;

drop policy if exists "versions: select own" on public.tracker_versions;
drop policy if exists "versions: insert own" on public.tracker_versions;
drop policy if exists "versions: update own" on public.tracker_versions;
create policy "versions: select own" on public.tracker_versions
  for select to authenticated using (user_id = auth.uid() and public.is_allowed());
create policy "versions: insert own" on public.tracker_versions
  for insert to authenticated with check (user_id = auth.uid() and public.is_allowed());
create policy "versions: update own" on public.tracker_versions
  for update to authenticated
  using (user_id = auth.uid() and public.is_allowed())
  with check (user_id = auth.uid() and public.is_allowed());
-- No delete policy on purpose: deletes go through public.delete_version(), which refuses to delete the last version.

create or replace function public.enforce_version_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- serialise concurrent inserts for the same user so the limit can't be raced
  perform pg_advisory_xact_lock(hashtext('tracker_versions:' || new.user_id::text));
  if (select count(*) from public.tracker_versions where user_id = new.user_id) >= 5 then
    raise exception 'You can have at most 5 versions.' using errcode = 'P0001', hint = 'version_limit';
  end if;
  new.name := btrim(new.name);
  return new;
end;
$$;
drop trigger if exists tracker_versions_limit on public.tracker_versions;
create trigger tracker_versions_limit before insert on public.tracker_versions
  for each row execute function public.enforce_version_limit();

-- 2) Per-user settings (active version follows the user across devices) -------------------
create table if not exists public.user_settings (
  user_id           uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  active_version_id uuid        references public.tracker_versions (id) on delete set null,
  updated_at        timestamptz not null default now()
);
alter table public.user_settings enable row level security;

drop policy if exists "settings: select own" on public.user_settings;
drop policy if exists "settings: insert own" on public.user_settings;
drop policy if exists "settings: update own" on public.user_settings;
create policy "settings: select own" on public.user_settings
  for select to authenticated using (user_id = auth.uid() and public.is_allowed());
create policy "settings: insert own" on public.user_settings
  for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_allowed()
    and (active_version_id is null or exists (
      select 1 from public.tracker_versions v where v.id = active_version_id and v.user_id = auth.uid()))
  );
create policy "settings: update own" on public.user_settings
  for update to authenticated
  using (user_id = auth.uid() and public.is_allowed())
  with check (
    user_id = auth.uid() and public.is_allowed()
    and (active_version_id is null or exists (
      select 1 from public.tracker_versions v where v.id = active_version_id and v.user_id = auth.uid()))
  );

-- 3) Progress: version, solution link, revisit flag, solved date ---------------------------
alter table public.progress add column if not exists version_id   uuid;
alter table public.progress add column if not exists solution_url text;
alter table public.progress add column if not exists needs_link   boolean not null default false;
alter table public.progress add column if not exists revisit      boolean not null default false;
alter table public.progress add column if not exists solved_at    timestamptz;

-- Backfill: one "Version 1" per user who already has progress, holding all their rows.
insert into public.tracker_versions (user_id, name)
select distinct p.user_id, 'Version 1'
from public.progress p
where not exists (select 1 from public.tracker_versions v where v.user_id = p.user_id);

update public.progress p
set version_id = (select v.id from public.tracker_versions v
                  where v.user_id = p.user_id order by v.created_at, v.id limit 1)
where p.version_id is null;

update public.progress set needs_link = true where solved and solution_url is null and not needs_link;
update public.progress set solved_at = updated_at where solved and solved_at is null;

insert into public.user_settings (user_id, active_version_id)
select distinct on (v.user_id) v.user_id, v.id
from public.tracker_versions v
order by v.user_id, v.created_at, v.id
on conflict (user_id) do nothing;

alter table public.progress alter column version_id set not null;

do $$
begin
  -- primary key: (user_id, problem_key) → (user_id, version_id, problem_key)
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.progress'::regclass and contype = 'p' and array_length(conkey, 1) = 2
  ) then
    alter table public.progress drop constraint progress_pkey;
    alter table public.progress add constraint progress_pkey primary key (user_id, version_id, problem_key);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'progress_version_fk') then
    alter table public.progress
      add constraint progress_version_fk foreign key (version_id, user_id)
      references public.tracker_versions (id, user_id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'progress_solution_url_format') then
    alter table public.progress
      add constraint progress_solution_url_format
      check (solution_url is null or (solution_url ~ '^https://[^[:space:]]+$' and char_length(solution_url) <= 500));
  end if;

  -- The core rule: a problem can only be solved with a solution link
  -- (rows solved before v2 are grandfathered via needs_link until a link is added).
  if not exists (select 1 from pg_constraint where conname = 'progress_solved_requires_link') then
    alter table public.progress
      add constraint progress_solved_requires_link
      check (not solved or solution_url is not null or needs_link);
  end if;
end;
$$;

create index if not exists progress_user_version_idx on public.progress (user_id, version_id);

-- needs_link is only ever set by the migration / the legacy import function, never by clients.
-- (Superseded by 003_needs_link_upsert.sql, which also lets upserts echo an existing flag.)
create or replace function public.progress_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.needs_link
     and (tg_op = 'INSERT' or not old.needs_link)
     and current_user in ('authenticated', 'anon') then
    raise exception 'needs_link cannot be set by clients; add a solution link instead'
      using errcode = 'P0001', hint = 'needs_link_forbidden';
  end if;
  if new.solution_url is not null then
    new.needs_link := false;          -- adding a link clears the "add link" flag
  end if;
  if new.solved and new.solved_at is null then
    new.solved_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists progress_guard on public.progress;
create trigger progress_guard before insert or update on public.progress
  for each row execute function public.progress_guard();

-- Existing progress policies (user_id = auth.uid() and is_allowed()) still apply; the composite
-- foreign key above guarantees version_id belongs to the same user.

-- 4) Notes: one per problem, shared across versions -------------------------------------
create table if not exists public.problem_notes (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  problem_key text        not null check (char_length(problem_key) between 1 and 300),
  note        text        not null check (char_length(note) <= 10000),
  updated_at  timestamptz not null default now(),
  primary key (user_id, problem_key)
);
alter table public.problem_notes enable row level security;

drop policy if exists "notes: select own" on public.problem_notes;
drop policy if exists "notes: insert own" on public.problem_notes;
drop policy if exists "notes: update own" on public.problem_notes;
drop policy if exists "notes: delete own" on public.problem_notes;
create policy "notes: select own" on public.problem_notes
  for select to authenticated using (user_id = auth.uid() and public.is_allowed());
create policy "notes: insert own" on public.problem_notes
  for insert to authenticated with check (user_id = auth.uid() and public.is_allowed());
create policy "notes: update own" on public.problem_notes
  for update to authenticated
  using (user_id = auth.uid() and public.is_allowed())
  with check (user_id = auth.uid() and public.is_allowed());
create policy "notes: delete own" on public.problem_notes
  for delete to authenticated using (user_id = auth.uid() and public.is_allowed());

-- 5) RPCs --------------------------------------------------------------------------------

-- First load: make sure the user has a version and an active version; returns the active version id.
create or replace function public.ensure_tracker_setup()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  active uuid;
begin
  if uid is null or not public.is_allowed() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('tracker_setup:' || uid::text));
  if not exists (select 1 from public.tracker_versions where user_id = uid) then
    insert into public.tracker_versions (user_id, name) values (uid, 'Version 1');
  end if;
  select s.active_version_id into active
  from public.user_settings s
  join public.tracker_versions v on v.id = s.active_version_id and v.user_id = uid
  where s.user_id = uid;
  if active is null then
    select id into active from public.tracker_versions where user_id = uid order by created_at, id limit 1;
    insert into public.user_settings (user_id, active_version_id) values (uid, active)
    on conflict (user_id) do update set active_version_id = excluded.active_version_id, updated_at = now();
  end if;
  return active;
end;
$$;

-- Delete a version (and its progress). Refuses to delete the last one; re-points the active version.
create or replace function public.delete_version(p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_active uuid;
begin
  if uid is null or not public.is_allowed() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('tracker_versions:' || uid::text));
  if not exists (select 1 from public.tracker_versions where id = p_version_id and user_id = uid) then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.tracker_versions where user_id = uid) <= 1 then
    raise exception 'You can''t delete your only version.' using errcode = 'P0001', hint = 'last_version';
  end if;
  delete from public.tracker_versions where id = p_version_id and user_id = uid;
  select id into next_active from public.tracker_versions where user_id = uid order by created_at, id limit 1;
  update public.user_settings
  set active_version_id = next_active, updated_at = now()
  where user_id = uid and (active_version_id is null or active_version_id = p_version_id);
  return next_active;
end;
$$;

-- Import problems solved before links were required (e.g. an old export). Only adds rows that
-- aren't solved yet in that version; they are flagged needs_link so the app asks for a link.
create or replace function public.import_legacy_solved(p_version_id uuid, p_keys text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null or not public.is_allowed() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracker_versions where id = p_version_id and user_id = uid) then
    raise exception 'version not found' using errcode = 'P0002';
  end if;
  if coalesce(array_length(p_keys, 1), 0) > 2000 then
    raise exception 'too many keys' using errcode = '22023';
  end if;
  insert into public.progress (user_id, version_id, problem_key, solved, needs_link, solved_at, updated_at)
  select uid, p_version_id, k, true, true, now(), now()
  from unnest(p_keys) as k
  where char_length(k) between 1 and 300
  on conflict (user_id, version_id, problem_key) do update
    set solved = true, needs_link = (public.progress.solution_url is null), updated_at = now()
    where not public.progress.solved;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.ensure_tracker_setup()                 from public, anon;
revoke all on function public.delete_version(uuid)                   from public, anon;
revoke all on function public.import_legacy_solved(uuid, text[])     from public, anon;
grant execute on function public.ensure_tracker_setup()              to authenticated;
grant execute on function public.delete_version(uuid)                to authenticated;
grant execute on function public.import_legacy_solved(uuid, text[])  to authenticated;

commit;
