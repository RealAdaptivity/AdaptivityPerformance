-- Payment moved off the website to in-person Square, so the Stripe `payments`
-- row that used to carry the customer's email is no longer created. That email
-- is how link-guest-booking matches a new account to a booking made as a guest,
-- so it has to live on the booking itself now.
alter table public.bookings add column if not exists customer_email text;

-- Backfill from the payment rows that still hold it, so existing guest
-- bookings stay claimable.
update public.bookings b
set customer_email = p.customer_email
from public.payments p
where p.booking_id = b.id
  and b.customer_email is null
  and p.customer_email is not null;

-- The job-claim gate required a Stripe-verified tax id. Nothing sets that any
-- more, so left alone it would lock every technician out of every job forever.
-- The requirement itself stays — a W-9 on file before claiming paid work — but
-- it is now recorded by an admin rather than by Stripe.
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

-- Admin-only, deliberately: a technician must never be able to certify their
-- own W-9. That self-certification path was removed earlier and is not coming
-- back through this door.
create or replace function public.admin_set_tech_w9(p_profile_id uuid, p_received boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(current_setting('request.jwt.claims', true), '') = ''
     and current_user <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  if current_user <> 'service_role'
     and public.current_user_role() is distinct from 'admin'::public.user_role then
    raise exception 'Only an admin can record a W-9';
  end if;

  update public.mechanic_details
  set w9_completed_at = case when p_received then coalesce(w9_completed_at, now()) else null end,
      tax_id_provided = p_received
  where profile_id = p_profile_id;
end;
$function$;

revoke all on function public.admin_set_tech_w9(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_tech_w9(uuid, boolean) to authenticated, service_role;
