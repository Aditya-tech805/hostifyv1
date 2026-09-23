-- ============================================================================
-- Hostify - Phase 4 part 1 - vote_log table
--
-- Run this BEFORE deploying Phase 4 code. Creates the table the /api/vote
-- route writes to. Safe to run on a live system - it adds a new table
-- without touching any existing one.
--
-- The unique constraint on (team_id, presenter_started_at, voter_fingerprint)
-- is what stops one device from voting more than once in a single presenter
-- window. The fingerprint is sha256(server-set cookie UUID).
-- ============================================================================

create table if not exists public.vote_log (
  id                     bigserial primary key,
  team_id                text   not null,
  presenter_started_at   bigint not null,
  voter_fingerprint      text   not null,
  choice                 text   not null check (choice in ('wow','cool','fine')),
  voter_ip               text,
  voter_ua               text,
  voted_at               timestamptz default now()
);

create unique index if not exists vote_log_unique_voter
  on public.vote_log (team_id, presenter_started_at, voter_fingerprint);

create index if not exists vote_log_team_window
  on public.vote_log (team_id, presenter_started_at);

-- ---------------------------------------------------------------------------
-- RLS: vote_log is internal forensic data. Only the API (which signs a
-- coordinator JWT server-side) can read or write it. Anon clients have no
-- access. This is a deliberate departure from kv's "reads open" pattern -
-- voter fingerprints + IPs should never be browsable from a phone.
-- ---------------------------------------------------------------------------
alter table public.vote_log enable row level security;

drop policy if exists "vote_log insert coord only" on public.vote_log;
drop policy if exists "vote_log select coord only" on public.vote_log;
drop policy if exists "vote_log update none"       on public.vote_log;
drop policy if exists "vote_log delete coord only" on public.vote_log;

create policy "vote_log insert coord only" on public.vote_log
  for insert to anon, authenticated
  with check (public.app_role() = 'coordinator');

create policy "vote_log select coord only" on public.vote_log
  for select to anon, authenticated
  using (public.app_role() = 'coordinator');

create policy "vote_log delete coord only" on public.vote_log
  for delete to anon, authenticated
  using (public.app_role() = 'coordinator');
-- No UPDATE policy = no row can ever be modified. Votes are append-only.
