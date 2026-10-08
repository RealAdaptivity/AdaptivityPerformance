-- Shop notes per vehicle, for the admin Research tab.
--
-- NHTSA recalls and complaints say what owners report; these say what the
-- shop found: confirmed fixes, part numbers, gotchas. Keyed by year / make /
-- model so a note made on one 2016 F-150 shows up for the next one. Admins
-- and techs read and add; only admins delete.

create table if not exists public.vehicle_notes (
  id uuid primary key default gen_random_uuid(),
  model_year smallint not null check (model_year between 1950 and 2100),
  make text not null check (length(trim(make)) between 1 and 60),
  model text not null check (length(trim(model)) between 1 and 80),
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  note text not null check (length(trim(note)) between 1 and 4000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.vehicle_notes is
  'Shop knowledge per year / make / model: confirmed fixes, part numbers, gotchas. Shown in the admin Research tab next to NHTSA recalls and complaints. vin records which vehicle the note came from, if any.';

create index if not exists vehicle_notes_lookup_idx
  on public.vehicle_notes (model_year, lower(make), lower(model), created_at desc);

alter table public.vehicle_notes enable row level security;

create policy vehicle_notes_staff_read on public.vehicle_notes
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy vehicle_notes_staff_insert on public.vehicle_notes
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy vehicle_notes_admin_delete on public.vehicle_notes
  for delete to authenticated
  using ((select public.current_user_role()) = 'admin'::public.user_role);

grant select, insert, delete on public.vehicle_notes to authenticated;
