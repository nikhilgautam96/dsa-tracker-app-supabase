-- DSA Tracker — migration 003: allow updating pre-v2 solved rows (needs_link) through upserts.
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run. Idempotent.
--
-- Why: the app saves rows with INSERT … ON CONFLICT DO UPDATE. Postgres checks CHECK constraints on the
-- proposed row before it detects the conflict, so a revisit toggle on a row solved before links were required
-- (solved, no link, needs_link) was rejected unless the client also sends needs_link = true. Clients may now
-- send needs_link = true, but only for a row that already has it on the server — so a new solve still can't
-- skip the solution link.

create or replace function public.progress_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.needs_link and current_user in ('authenticated', 'anon') then
    if tg_op = 'UPDATE' then
      if not old.needs_link then
        raise exception 'needs_link cannot be set by clients; add a solution link instead'
          using errcode = 'P0001', hint = 'needs_link_forbidden';
      end if;
    elsif not exists (
      select 1 from public.progress p
      where p.user_id = new.user_id and p.version_id = new.version_id
        and p.problem_key = new.problem_key and p.needs_link
    ) then
      raise exception 'needs_link cannot be set by clients; add a solution link instead'
        using errcode = 'P0001', hint = 'needs_link_forbidden';
    end if;
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
