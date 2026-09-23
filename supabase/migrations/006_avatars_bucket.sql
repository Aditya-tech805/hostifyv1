-- ============================================================================
-- Hostify - Avatars bucket (judges + seniors profile photos)
--
-- Run this in Supabase SQL Editor. Coordinator uploads judge / senior
-- photos from /console; participants and the projector display them
-- instead of initials when present.
--
-- Public bucket: avatars are shown on every device anyway. The path
-- pattern is "<kind>/<id>.<ext>" where kind is 'panel' or 'senior' and
-- id is the synced record's id.
-- ============================================================================

-- 1. The avatars bucket. 2 MB / file; only common image MIME types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies. Reads open (matches the public flag, explicit anyway).
drop policy if exists "avatars read open"          on storage.objects;
drop policy if exists "avatars insert coord only"  on storage.objects;
drop policy if exists "avatars update coord only"  on storage.objects;
drop policy if exists "avatars delete coord only"  on storage.objects;

create policy "avatars read open" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Writes / deletes are coord-only: the panel + seniors list is curated
-- from the console anyway, and avatars travel with that list.
create policy "avatars insert coord only" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'avatars'
    and (auth.jwt() ->> 'app_role') = 'coordinator'
  );

create policy "avatars update coord only" on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'avatars'
    and (auth.jwt() ->> 'app_role') = 'coordinator'
  );

create policy "avatars delete coord only" on storage.objects
  for delete to anon, authenticated
  using (
    bucket_id = 'avatars'
    and (auth.jwt() ->> 'app_role') = 'coordinator'
  );

-- Quick sanity check:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
--   select policyname from pg_policies where tablename = 'objects' and policyname like 'avatars%';
