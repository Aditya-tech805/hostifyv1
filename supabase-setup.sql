-- ─────────────────────────────────────────────────────────────────────────────
-- INNOVATRIX 26 · Supabase setup
-- Paste this whole file into the SQL Editor on your Supabase project and run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Key-value table that backs every synced piece of app state.
create table if not exists public.kv (
  path        text primary key,
  value       jsonb,
  updated_at  timestamptz default now()
);

-- 2. Enable Realtime so subscriptions get push updates.
alter publication supabase_realtime add table public.kv;

-- 3. Row-Level Security — open for the event scope (no per-user auth).
--    Tighten this AFTER the event if you keep the project around.
alter table public.kv enable row level security;

drop policy if exists "kv anon select" on public.kv;
drop policy if exists "kv anon insert" on public.kv;
drop policy if exists "kv anon update" on public.kv;
drop policy if exists "kv anon delete" on public.kv;

create policy "kv anon select" on public.kv for select to anon, authenticated using (true);
create policy "kv anon insert" on public.kv for insert to anon, authenticated with check (true);
create policy "kv anon update" on public.kv for update to anon, authenticated using (true) with check (true);
create policy "kv anon delete" on public.kv for delete to anon, authenticated using (true);
