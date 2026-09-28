-- Structured vehicle details on the booking itself.
--
-- public.vehicles already holds year/make/model/trim, but it requires an
-- owner_id, so a guest booking cannot use it. Most bookings are guests, so
-- the detail lives on the booking and vehicles stays the signed-in garage.
alter table public.bookings
  add column if not exists vehicle_year text,
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_trim text,
  add column if not exists vehicle_engine text,
  add column if not exists issue_description text,
  -- Storage paths, not public URLs: the bucket is private and the portal
  -- mints a signed URL when a tech opens the job.
  add column if not exists media_paths text[] not null default '{}';

comment on column public.bookings.vehicle_description is
  'Composed from the vehicle_* parts by create-booking-request. Kept because it is NOT NULL and the tech portal, receipts and the confirmation SMS all read it.';
comment on column public.bookings.media_paths is
  'Paths inside the private booking-media storage bucket. Optional: a customer may book without uploading anything.';

-- vehicles has no engine column; the booking form asks for it, so the
-- signed-in garage can record it too rather than losing it on save.
alter table public.vehicles
  add column if not exists engine text;

-- Private bucket for the photos and videos a customer attaches.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-media',
  'booking-media',
  false,
  52428800, -- 50 MB, enough for a short phone video of a noise
  array[
    'image/jpeg','image/png','image/heic','image/heif','image/webp',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

-- A booking is taken from people who are not signed in, so the upload has to
-- be open to anon. Reading is not: only staff can see what was uploaded.
drop policy if exists "booking media anon upload" on storage.objects;
create policy "booking media anon upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'booking-media');

drop policy if exists "booking media staff read" on storage.objects;
create policy "booking media staff read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-media'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'tech')
    )
  );

drop policy if exists "booking media staff delete" on storage.objects;
create policy "booking media staff delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'booking-media'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );
