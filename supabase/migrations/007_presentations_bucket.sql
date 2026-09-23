-- ============================================================================
-- Hostify - Team presentations bucket (PPT / PPTX / PDF uploads)
--
-- Run this in Supabase SQL Editor. Creates the storage bucket teams will
-- upload their presentations to, plus the RLS policies that scope writes
-- to each team's own folder.
--
-- Public bucket: presentations are not sensitive (they get shown to the
-- panel + audience during judging anyway), and going public means the
-- coordinator can one-click download from /console without juggling
-- signed URLs.
-- ============================================================================

-- 1. The slides bucket. 25 MB / file cap; only PPT, PPTX, PDF mime types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'slides',
  'slides',
  true,
  26214400, -- 25 MB
  array[
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
    'application/vnd.ms-powerpoint',                                              -- .ppt
    'application/pdf'                                                              -- .pdf
  ]
) on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies.
-- Reads: open (matches the bucket's public flag; explicit anyway).
drop policy if exists "slides read open"          on storage.objects;
drop policy if exists "slides insert team own"    on storage.objects;
drop policy if exists "slides delete team or coord" on storage.objects;
drop policy if exists "slides update team or coord" on storage.objects;

create policy "slides read open" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'slides');

-- Writes: only with a team JWT, and only into a folder whose name matches
-- the team_id claim. Stops one team from uploading into another team's
-- folder.
create policy "slides insert team own" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'slides'
    and (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'team_id', '__none__')
  );

create policy "slides update team or coord" on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'slides'
    and (
      (auth.jwt() ->> 'app_role') = 'coordinator'
      or (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'team_id', '__none__')
    )
  );

-- Deletes: the team itself (replacing an old file before uploading a new
-- one), plus the coordinator (cleanup tool).
create policy "slides delete team or coord" on storage.objects
  for delete to anon, authenticated
  using (
    bucket_id = 'slides'
    and (
      (auth.jwt() ->> 'app_role') = 'coordinator'
      or (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'team_id', '__none__')
    )
  );

-- 3. Extend app_can_write_kv so teams can write their own presentation
-- metadata at kv path `presentations/<their_team_id>`. Mirrors Phase 4's
-- function definition - copy/paste-friendly with the new path added to
-- the team role's allowed set. Coordinator still writes anything.
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
        or p = 'presentations/' || tid   -- NEW: own presentation metadata
        or p like 'gallery/%'
        or p like 'pollSubmissions/%';
  end if;

  if role = '' or role is null then
    return p like 'pollSubmissions/%';
  end if;

  return false;
end;
$$;

-- ============================================================================
-- Quick sanity check after running:
--   select * from storage.buckets where id = 'slides';
--   select policyname from pg_policies where tablename = 'objects' and policyname like 'slides%';
-- Should show the bucket configured and four policies (read / insert / update / delete).
-- ============================================================================
