-- Technicians clock in before taking work and clock out when done. A job can
-- only be claimed while a shift is open, so dispatch knows who is actually
-- available rather than inferring it from who happens to be looking.
create table if not exists public.tech_shifts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  created_at timestamptz not null default now()
);

-- At most one open shift per technician. A partial unique index is what makes
-- double clock-in impossible, rather than a check in application code that a
-- second tab could race past.
create unique index if not exists tech_shifts_one_open_per_tech
  on public.tech_shifts (profile_id)
  where clocked_out_at is null;

create index if not exists tech_shifts_profile_started_idx
  on public.tech_shifts (profile_id, clocked_in_at desc);

alter table public.tech_shifts enable row level security;

-- Scoped from the start: a tech sees only their own shifts, admins see all.
-- auth.uid() wrapped in a scalar subquery so it evaluates once per statement.
drop policy if exists tech_shifts_select on public.tech_shifts;
create policy tech_shifts_select on public.tech_shifts
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.current_user_role() = 'admin'::public.user_role
  );

-- No direct writes: clocking in and out goes through the functions below so the
-- open-shift rule and the role check cannot be sidestepped.
revoke insert, update, delete on public.tech_shifts from authenticated, anon;

create or replace function public.tech_clock_in()
 returns timestamptz
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_started timestamptz;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() is distinct from 'tech'::public.user_role then
    raise exception 'Only technicians clock in';
  end if;

  select clocked_in_at into v_started
  from public.tech_shifts
  where profile_id = v_user and clocked_out_at is null;
  if v_started is not null then
    return v_started;  -- already on shift; clocking in again is a no-op
  end if;

  insert into public.tech_shifts (profile_id) values (v_user)
  returning clocked_in_at into v_started;
  return v_started;
end;
$function$;

create or replace function public.tech_clock_out()
 returns timestamptz
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_ended timestamptz;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  -- Leaving mid-job would strand the customer, so finish or release first.
  if exists (
    select 1 from public.bookings
    where mechanic_id = v_user and status in ('EN_ROUTE', 'ON_SITE')
  ) then
    raise exception 'Finish or release your active job before clocking out';
  end if;

  update public.tech_shifts
  set clocked_out_at = now()
  where profile_id = v_user and clocked_out_at is null
  returning clocked_out_at into v_ended;

  if v_ended is null then raise exception 'You are not clocked in'; end if;
  return v_ended;
end;
$function$;

revoke all on function public.tech_clock_in() from public, anon;
revoke all on function public.tech_clock_out() from public, anon;
grant execute on function public.tech_clock_in() to authenticated, service_role;
grant execute on function public.tech_clock_out() to authenticated, service_role;

-- The claim gate now requires an open shift, on top of the existing W-9 and
-- signed-agreement requirements.
create or replace function public.claim_booking_for_current_tech(p_reference text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_detail public.mechanic_details%rowtype;
  v_reference text;
  v_required_version text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() is distinct from 'tech'::public.user_role then raise exception 'Only approved technicians can claim jobs'; end if;

  if not exists (
    select 1 from public.tech_shifts where profile_id = v_user and clocked_out_at is null
  ) then
    raise exception 'Clock in before claiming a job';
  end if;

  select * into v_detail from public.mechanic_details where profile_id = v_user;
  if v_detail.w9_completed_at is null or not coalesce(v_detail.tax_id_provided, false) then raise exception 'Your W-9 is not on file yet — dispatch records it once they have it'; end if;
  if v_detail.contractor_agreement_signed_at is null or v_detail.contractor_agreement_signature_path is null then raise exception 'Sign the Independent Contractor Agreement before claiming a job'; end if;

  select value into v_required_version from public.app_config where key = 'contractor_agreement_version';
  if v_required_version is not null
     and coalesce(v_detail.contractor_agreement_version, '') is distinct from v_required_version then
    raise exception 'The Independent Contractor Agreement has been updated — sign the current version before claiming a job';
  end if;

  if v_detail.job_capacity = 'standalone' and exists (select 1 from public.bookings where mechanic_id = v_user and status in ('EN_ROUTE', 'ON_SITE')) then raise exception 'Finish your active job or switch to Multi-job before claiming another'; end if;
  update public.bookings set status = 'EN_ROUTE', mechanic_id = v_user, eta_minutes = 20, distance_miles = 8, updated_at = now()
  where upper(reference_code) = upper(trim(p_reference)) and status = 'UNASSIGNED' and mechanic_id is null
  returning reference_code into v_reference;
  if v_reference is null then raise exception 'Job is no longer available'; end if;
  return v_reference;
end;
$function$;
