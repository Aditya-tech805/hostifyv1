-- ============================================================================
-- INNOVATRIX 26 - Phase 3 RLS update
--
-- Run this AFTER Phase 3 code is deployed to Vercel and verified working.
-- Paste into the Supabase SQL Editor -> Run.
--
-- What changes:
--   1. teams/* writes now require either a coordinator JWT, OR a team JWT
--      whose `team_id` claim matches the path segment. Anonymous writes to
--      teams/* are BLOCKED. This stops a hostile student from renaming or
--      overwriting a rival team via the open kv table.
--   2. mentorPings/* writes are now judge-only (mentors signed in via
--      /mentor share the judge role). Anonymous spam is blocked.
--   3. gallery/* metadata writes are now team-only (photo booth requires a
--      registered team anyway, so this just enforces the existing UX
--      contract at the database level).
--   4. sprintSubs/<teamId> writes are team-only and must match the
--      writer's team_id - one team can't submit on behalf of another.
--
-- Still open after Phase 3 (Phase 4 will tighten):
--   - audienceVotes/* - anyone in the room can vote, no rate limit yet
--   - pollSubmissions/* - one word per device, dedup is client-side
--
-- ROLLBACK at the bottom of this file.
-- ============================================================================

create or replace function public.app_can_write_kv(p text)
returns boolean
language plpgsql
stable
as $$
declare
  role  text := app_role();
  jname text := judge_name();
  tid   text := coalesce(auth.jwt() ->> 'team_id', '');
begin
  -- Coordinator: full write access. Use this judiciously - the audit trail
  -- only shows the JWT role, not the human, so coord writes should be rare
  -- and intentional.
  if role = 'coordinator' then
    return true;
  end if;

  -- Judge: only their own scores, plus mentor pings (mentors share the
  -- judge role via the same PIN).
  if role = 'judge' then
    return p like 'scores/' || jname || '/%'
        or p like 'mentorPings/%';
  end if;

  -- Team: only paths bound to their own team_id, plus the open vote/poll
  -- paths (Phase 4 will move those behind /api/vote).
  if role = 'team' and tid <> '' then
    return p = 'teams/' || tid
        or p = 'sprintSubs/' || tid
        or p like 'gallery/%'
        or p like 'audienceVotes/%'
        or p like 'pollSubmissions/%';
  end if;

  -- Anonymous (no token): only the genuinely-anon paths remain.
  -- Teams/scores/messages/spotlight/etc are now BLOCKED for anon.
  if role = '' or role is null then
    return p like 'audienceVotes/%'
        or p like 'pollSubmissions/%';
  end if;

  return false;
end;
$$;

-- The kv read/insert/update/delete policies from Phase 2 already call this
-- function, so they pick up the new behavior automatically. No policy
-- recreation needed.

-- ============================================================================
-- ROLLBACK to Phase 2 (paste this in SQL Editor if Phase 3 breaks something):
--
-- create or replace function public.app_can_write_kv(p text)
-- returns boolean
-- language plpgsql
-- stable
-- as $$
-- declare
--   role  text := app_role();
--   jname text := judge_name();
-- begin
--   if role = 'coordinator' then return true; end if;
--   if role = 'judge' then
--     if p like 'scores/' || jname || '/%' then return true; end if;
--     return false;
--   end if;
--   if role = '' or role is null then
--     return p like 'teams/%'
--         or p like 'audienceVotes/%'
--         or p like 'mentorPings/%'
--         or p like 'pollSubmissions/%'
--         or p like 'sprintSubs/%'
--         or p like 'gallery/%';
--   end if;
--   return false;
-- end;
-- $$;
-- ============================================================================
