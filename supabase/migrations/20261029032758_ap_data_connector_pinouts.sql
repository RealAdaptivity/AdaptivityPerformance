-- AP Data: connector pinouts techs record per vehicle — which pin does what,
-- the wire colour, and what they measured there. Shop-entered only; OEM
-- wiring data is licensed and is not copied in. Staff only, like vehicle_specs.

create table if not exists public.connector_pinouts (
  id uuid primary key default gen_random_uuid(),
  model_year smallint check (model_year is null or model_year between 1950 and 2100),
  make text not null check (length(trim(make)) between 1 and 60),
  model text check (model is null or length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  component text not null check (length(trim(component)) between 1 and 120),
  connector text check (connector is null or length(trim(connector)) between 1 and 80),
  view_from text check (view_from is null or view_from in ('harness', 'component')),
  pins jsonb not null default '[]'::jsonb check (jsonb_typeof(pins) = 'array' and jsonb_array_length(pins) <= 200),
  notes text check (notes is null or length(notes) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.connector_pinouts is
  'AP Data connector pinouts recorded by techs: pins [{pin, function, color, value}]. Staff only.';

create index if not exists connector_pinouts_vehicle_idx
  on public.connector_pinouts (lower(make), lower(model), model_year);
create index if not exists connector_pinouts_created_by_idx on public.connector_pinouts (created_by);

alter table public.connector_pinouts enable row level security;

create policy connector_pinouts_staff_read on public.connector_pinouts
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy connector_pinouts_staff_insert on public.connector_pinouts
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy connector_pinouts_author_update on public.connector_pinouts
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

create policy connector_pinouts_author_delete on public.connector_pinouts
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

grant select, insert, update, delete on public.connector_pinouts to authenticated;

create trigger connector_pinouts_keep_authorship
  before update on public.connector_pinouts
  for each row execute function public.apdata_keep_authorship();
