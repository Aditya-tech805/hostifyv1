-- ============================================================================
-- Hostify - Lock down finalResults SELECT to coordinator only
--
-- Run this in Supabase SQL Editor. It tightens the kv SELECT policy so
-- the master rankings row (path='finalResults') is invisible to anyone
-- without an `app_role: coordinator` JWT.
--
-- Everything else stays openly readable - the projector and the
-- participant phones read from `publicReveal` instead, which is a
-- stage-filtered slice the coordinator console writes whenever the
-- ceremony stage changes. publicReveal only contains rows that have
-- been intentionally exposed.
--
-- Result: a curious team member opening DevTools or hitting the
-- Supabase REST endpoint directly gets back NOTHING for finalResults.
-- They see only what publicReveal has at this exact moment - the same
-- thing the projector is showing.
-- ============================================================================

drop policy if exists "kv read open" on public.kv;

create policy "kv read open" on public.kv
  for select to anon, authenticated
  using (
    path <> 'finalResults'
    or (auth.jwt() ->> 'app_role') = 'coordinator'
  );

-- Sanity check:
--   set role anon;
--   select count(*) from public.kv where path = 'finalResults';  -- expect 0
--   reset role;
--   -- (with a coord JWT in a real client this returns 1)
