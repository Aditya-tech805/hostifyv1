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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Storage bucket for the photo booth (participant selfies w/ INNOVATRIX frame)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5. Storage policies — open for the event scope
drop policy if exists "gallery anon select" on storage.objects;
drop policy if exists "gallery anon insert" on storage.objects;
drop policy if exists "gallery anon delete" on storage.objects;

create policy "gallery anon select" on storage.objects for select to anon, authenticated
  using (bucket_id = 'gallery');
create policy "gallery anon insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gallery');
create policy "gallery anon delete" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'gallery');
