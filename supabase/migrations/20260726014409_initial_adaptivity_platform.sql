-- Adaptivity: shared schema for web, customer app, and tech dispatch

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('customer', 'tech', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum ('UNASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.location_type as enum ('mobile', 'shop');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mechanic_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  van_number text,
  role_title text default 'ASE Technician',
  stripe_account_id text,
  rating numeric(3, 1) default 4.9,
  tools_verified boolean not null default false,
  revenue_share_pct integer not null default 80,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  year text,
  make text not null,
  model text not null,
  trim text,
  vin text,
  license_plate text,
  mileage text,
  health_score integer,
  health_status text check (health_status in ('good', 'warning', 'urgent')),
  health_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  customer_id uuid references public.profiles (id) on delete set null,
  mechanic_id uuid references public.profiles (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  zip_code text,
  vehicle_description text not null,
  vin text,
  services jsonb not null default '[]'::jsonb,
  total_estimate numeric(10, 2) not null default 0,
  location_type public.location_type not null default 'mobile',
  status public.job_status not null default 'UNASSIGNED',
  distance_miles numeric(6, 2) not null default 0,
  eta_minutes integer not null default 0,
  dispatch_lat numeric,
  dispatch_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  inspector_profile_id uuid references public.profiles (id) on delete set null,
  inspector_name text,
  findings_json jsonb not null default '{}'::jsonb,
  customer_signature_url text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  resolved_role public.user_role;
begin
  meta_role := new.raw_user_meta_data ->> 'role';
  resolved_role := case
    when meta_role = 'tech' then 'tech'::public.user_role
    when meta_role = 'admin' then 'admin'::public.user_role
    else 'customer'::public.user_role
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    resolved_role
  );

  if resolved_role = 'tech' then
    insert into public.mechanic_details (profile_id, van_number, role_title)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'van_number', 'Mobile Unit'),
      coalesce(new.raw_user_meta_data ->> 'role_title', 'ASE Technician')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.generate_booking_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_code is null or new.reference_code = '' then
    new.reference_code := 'AP-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_reference on public.bookings;
create trigger bookings_set_reference
before insert on public.bookings
for each row execute function public.generate_booking_reference();

create or replace function public.get_booking_by_reference(ref text)
returns table (
  id uuid,
  reference_code text,
  customer_name text,
  customer_phone text,
  customer_address text,
  zip_code text,
  vehicle_description text,
  services jsonb,
  total_estimate numeric,
  location_type public.location_type,
  status public.job_status,
  distance_miles numeric,
  eta_minutes integer,
  mechanic_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.reference_code,
    b.customer_name,
    b.customer_phone,
    b.customer_address,
    b.zip_code,
    b.vehicle_description,
    b.services,
    b.total_estimate,
    b.location_type,
    b.status,
    b.distance_miles,
    b.eta_minutes,
    b.mechanic_id,
    b.created_at,
    b.updated_at
  from public.bookings b
  where upper(b.reference_code) = upper(ref)
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.mechanic_details enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.inspection_reports enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "mechanic_details_select_authenticated" on public.mechanic_details;
create policy "mechanic_details_select_authenticated"
  on public.mechanic_details for select to authenticated
  using (true);

drop policy if exists "mechanic_details_update_own" on public.mechanic_details;
create policy "mechanic_details_update_own"
  on public.mechanic_details for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "vehicles_owner_all" on public.vehicles;
create policy "vehicles_owner_all"
  on public.vehicles for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "bookings_insert_guest_or_customer" on public.bookings;
create policy "bookings_insert_guest_or_customer"
  on public.bookings for insert to anon, authenticated
  with check (
    customer_id is null
    or customer_id = auth.uid()
  );

drop policy if exists "bookings_select_customer" on public.bookings;
create policy "bookings_select_customer"
  on public.bookings for select to authenticated
  using (
    customer_id = auth.uid()
    or public.current_user_role() in ('tech', 'admin')
  );

drop policy if exists "bookings_select_tech_unassigned_or_assigned" on public.bookings;
create policy "bookings_select_tech_unassigned_or_assigned"
  on public.bookings for select to authenticated
  using (
    public.current_user_role() = 'tech'
    and (status = 'UNASSIGNED' or mechanic_id = auth.uid())
  );

drop policy if exists "bookings_update_tech_or_admin" on public.bookings;
create policy "bookings_update_tech_or_admin"
  on public.bookings for update to authenticated
  using (
    public.current_user_role() in ('tech', 'admin')
    and (mechanic_id = auth.uid() or status = 'UNASSIGNED' or public.current_user_role() = 'admin')
  )
  with check (true);

drop policy if exists "bookings_update_customer_own" on public.bookings;
create policy "bookings_update_customer_own"
  on public.bookings for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists "inspection_reports_select_involved" on public.inspection_reports;
create policy "inspection_reports_select_involved"
  on public.inspection_reports for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or b.mechanic_id = auth.uid())
    )
    or public.current_user_role() = 'admin'
  );

drop policy if exists "inspection_reports_insert_tech" on public.inspection_reports;
create policy "inspection_reports_insert_tech"
  on public.inspection_reports for insert to authenticated
  with check (public.current_user_role() in ('tech', 'admin'));

grant usage on schema public to anon, authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant insert on public.bookings to anon;
grant execute on function public.get_booking_by_reference(text) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;
