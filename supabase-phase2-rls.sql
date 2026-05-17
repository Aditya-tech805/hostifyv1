-- ─────────────────────────────────────────────────────────────────────────────
-- INNOVATRIX 26 · Phase 2 RLS lockdown
--
-- Run this AFTER Phase 1 (server-side JWT auth) is deployed and tested.
-- Paste this into the Supabase SQL Editor → Run.
--
-- What it does:
--   1. Defines an authorization function `app_can_write_kv(path)` that reads
--      the JWT's `app_role` claim and returns TRUE if that role is allowed
--      to write the given path.
--   2. Replaces the open `using (true)` write policies on `public.kv` with
--      policies that call the function.
--   3. Storage policies for the photo gallery: writes still open (Phase 3
--      will add team ownership), deletes restricted to coordinators.
--
-- Reads remain open (SELECT policy unchanged) so the projector and
-- participant views work without a token.
--
-- ROLLBACK: see the bottom of this file.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Helper: pull a claim out of the request JWT ─────────────────────────
-- `auth.jwt()` returns the JWT payload as JSONB. If no token was sent,
-- it returns null and our `app_role` lookup yields null too.

create or replace function public.app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', '');
$$;

create or replace function public.judge_name()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'judge_name', '');
$$;

-- ─── 2. Per-path authorization function ─────────────────────────────────────
-- Maps each kv `path` to the role(s) allowed to write it. Coordinator can
-- write anything. Judges can only write their own `scores/{their_name}/*`
-- rows. Teams can write their own team row, their own sprint submission,
-- and their own gallery metadata (Phase 3 will enforce team ownership
-- properly with a team_id claim — for now teams/* stays open below until
-- that lands).

create or replace function public.app_can_write_kv(p text)
returns boolean
language plpgsql
stable
as $$
declare
  role  text := app_role();
  jname text := judge_name();
begin
  -- Coordinator: full write access. Use this sparingly in policies — we
  -- still want the path constraints below to keep judges/teams scoped.
  if role = 'coordinator' then
    return true;
  end if;

  -- Judges may only update their own scores. The path is `scores/<name>/<teamId>`.
  -- We require an exact match between the judge_name claim and the second
  -- path segment.
  if role = 'judge' then
    if p like 'scores/' || jname || '/%' then
      return true;
    end if;
    return false;
  end if;

  -- No token at all (anon): Phase 2's baseline. Subsequent phases narrow
  -- this set further - Phase 3 requires a team JWT for teams/*, gallery/*,
  -- sprintSubs/* and mentor pings, and Phase 4 moves audienceVotes/* behind
  -- the /api/vote endpoint. If you only run Phase 2 (e.g., for a stripped-
  -- down version of the event), the anon-writable paths below are what
  -- participants still need to use without ever logging in.
  if role = '' or role is null then
    return p like 'teams/%'
        or p like 'audienceVotes/%'
        or p like 'mentorPings/%'
        or p like 'pollSubmissions/%'
        or p like 'sprintSubs/%'
        or p like 'gallery/%';
  end if;

  return false;
end;
$$;

-- ─── 3. Replace open kv policies with role-aware ones ───────────────────────
drop policy if exists "kv anon select" on public.kv;
drop policy if exists "kv anon insert" on public.kv;
drop policy if exists "kv anon update" on public.kv;
drop policy if exists "kv anon delete" on public.kv;

-- Reads stay open (the projector + participant views need this).
create policy "kv read open" on public.kv
  for select to anon, authenticated
  using (true);

create policy "kv insert by role" on public.kv
  for insert to anon, authenticated
  with check (public.app_can_write_kv(path));

create policy "kv update by role" on public.kv
  for update to anon, authenticated
  using (public.app_can_write_kv(path))
  with check (public.app_can_write_kv(path));

-- Deletes — coordinator-only. Even a team can't delete its own team row;
-- the coordinator does that from /console after the event.
create policy "kv delete coord only" on public.kv
  for delete to anon, authenticated
  using (public.app_role() = 'coordinator');

-- ─── 4. Storage policies (photo gallery) ────────────────────────────────────
-- Phase 3 will replace the open insert with a team-id check on the path.
-- For now, deletes are restricted to coordinators so a hostile student
-- can't wipe other teams' photos.

drop policy if exists "gallery anon select" on storage.objects;
drop policy if exists "gallery anon insert" on storage.objects;
drop policy if exists "gallery anon delete" on storage.objects;

create policy "gallery read open" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

create policy "gallery insert open" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'gallery');

create policy "gallery delete coord only" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'gallery' and public.app_role() = 'coordinator');

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (if Phase 2 breaks something on event day, paste this in SQL Editor):
--
-- drop policy if exists "kv read open"          on public.kv;
-- drop policy if exists "kv insert by role"     on public.kv;
-- drop policy if exists "kv update by role"     on public.kv;
-- drop policy if exists "kv delete coord only"  on public.kv;
-- create policy "kv anon select" on public.kv for select to anon, authenticated using (true);
-- create policy "kv anon insert" on public.kv for insert to anon, authenticated with check (true);
-- create policy "kv anon update" on public.kv for update to anon, authenticated using (true) with check (true);
-- create policy "kv anon delete" on public.kv for delete to anon, authenticated using (true);
-- drop policy if exists "gallery read open"        on storage.objects;
-- drop policy if exists "gallery insert open"      on storage.objects;
-- drop policy if exists "gallery delete coord only" on storage.objects;
-- create policy "gallery anon select" on storage.objects for select to anon, authenticated using (bucket_id = 'gallery');
-- create policy "gallery anon insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'gallery');
-- create policy "gallery anon delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'gallery');
-- ─────────────────────────────────────────────────────────────────────────────
