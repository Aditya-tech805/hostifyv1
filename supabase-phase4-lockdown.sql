-- ============================================================================
-- INNOVATRIX 26 - Phase 4 part 2 - tighten audienceVotes/* writes
--
-- Run this AFTER the Phase 4 code is deployed to Vercel AND verified
-- (audience can cast a vote via the live site). This SQL closes the last
-- direct-write path to audienceVotes/* - after this, only the /api/vote
-- route (which signs a coordinator JWT server-side) can update tallies.
--
-- Reads stay open so the projector and the vote page can show live tallies.
--
-- ROLLBACK at the bottom.
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
  if role = 'coordinator' then
    return true;
  end if;

  if role = 'judge' then
    return p like 'scores/' || jname || '/%'
        or p like 'mentorPings/%';
  end if;

  if role = 'team' and tid <> '' then
    return p = 'teams/' || tid
        or p = 'sprintSubs/' || tid
        or p like 'gallery/%'
        or p like 'pollSubmissions/%';
        -- audienceVotes/* removed: /api/vote (coord-signed) is now the only writer
  end if;

  -- Anonymous: only pollSubmissions/* (one word per device, rate-limited
  -- by deviceId on the client). audienceVotes/* is now coord-only.
  if role = '' or role is null then
    return p like 'pollSubmissions/%';
  end if;

  return false;
end;
$$;

-- ============================================================================
-- ROLLBACK to Phase 3 (paste this in SQL Editor if Phase 4 lockdown breaks
-- the vote page):
--
-- create or replace function public.app_can_write_kv(p text)
-- returns boolean
-- language plpgsql
-- stable
-- as $$
-- declare
--   role  text := app_role();
--   jname text := judge_name();
--   tid   text := coalesce(auth.jwt() ->> 'team_id', '');
-- begin
--   if role = 'coordinator' then return true; end if;
--   if role = 'judge' then
--     return p like 'scores/' || jname || '/%' or p like 'mentorPings/%';
--   end if;
--   if role = 'team' and tid <> '' then
--     return p = 'teams/' || tid
--         or p = 'sprintSubs/' || tid
--         or p like 'gallery/%'
--         or p like 'audienceVotes/%'
--         or p like 'pollSubmissions/%';
--   end if;
--   if role = '' or role is null then
--     return p like 'audienceVotes/%' or p like 'pollSubmissions/%';
--   end if;
--   return false;
-- end;
-- $$;
-- ============================================================================
