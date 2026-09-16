-- Require the CURRENT contractor agreement version before a tech can claim a job.
--
-- Before this, the gate only asked whether a signature existed. A tech who signed
-- an older version stayed eligible forever, so revising the agreement changed
-- nothing for anyone already on the platform. The required version lives in a
-- config row so it can be bumped without editing the function.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists app_config_read_authenticated on public.app_config;
create policy app_config_read_authenticated
  on public.app_config
  for select
  to authenticated
  using (true);

-- No write policy: service role and migrations only.

insert into public.app_config (key, value)
values ('contractor_agreement_version', '2026-09-v2')
on conflict (key) do update set value = excluded.value, updated_at = now();

create or replace function public.claim_booking_for_current_tech(p_reference text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_detail public.mechanic_details%rowtype;
  v_reference text;
  v_required_version text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() is distinct from 'tech'::public.user_role then raise exception 'Only approved technicians can claim jobs'; end if;
  select * into v_detail from public.mechanic_details where profile_id = v_user;
  if v_detail.w9_completed_at is null or not coalesce(v_detail.tax_id_provided, false) then raise exception 'Complete Stripe tax ID verification before claiming a job'; end if;
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
$$;

revoke all on function public.claim_booking_for_current_tech(text) from public;
grant execute on function public.claim_booking_for_current_tech(text) to authenticated;
