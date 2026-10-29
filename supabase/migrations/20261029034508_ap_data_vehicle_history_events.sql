-- AP Data: vehicle history facts the shop records against a VIN — wrecks,
-- damage seen, flood signs, title brands, owner changes, theft, airbag
-- deployment, odometer readings and service done elsewhere — with where each
-- fact came from (customer, seen on the vehicle, title document, a report).
-- These are the shop's own records, not official title data. Staff only.

create table if not exists public.vehicle_history_events (
  id uuid primary key default gen_random_uuid(),
  vin text not null check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  kind text not null check (kind in ('odometer', 'accident', 'damage_seen', 'flood', 'title_brand', 'owner_change', 'theft', 'airbag', 'service_elsewhere', 'other')),
  event_date date check (event_date is null or event_date between date '1950-01-01' and date '2100-12-31'),
  mileage integer check (mileage is null or mileage between 0 and 2000000),
  note text not null check (length(trim(note)) between 1 and 2000),
  source text check (source is null or length(source) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.vehicle_history_events is
  'AP Data vehicle history facts recorded by staff per VIN (accidents, title brands, owners, odometer, outside service), with their source. Staff only.';

create index if not exists vehicle_history_events_vin_idx on public.vehicle_history_events (vin);
create index if not exists vehicle_history_events_created_by_idx on public.vehicle_history_events (created_by);

alter table public.vehicle_history_events enable row level security;

create policy vehicle_history_events_staff_read on public.vehicle_history_events
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy vehicle_history_events_staff_insert on public.vehicle_history_events
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy vehicle_history_events_author_update on public.vehicle_history_events
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

create policy vehicle_history_events_author_delete on public.vehicle_history_events
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

grant select, insert, update, delete on public.vehicle_history_events to authenticated;

create trigger vehicle_history_events_keep_authorship
  before update on public.vehicle_history_events
  for each row execute function public.apdata_keep_authorship();
