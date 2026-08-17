drop function if exists public.mark_tech_w9_complete();

drop policy if exists "bookings_update_tech_or_admin" on public.bookings;
create policy "bookings_update_tech_or_admin" on public.bookings for update to authenticated
using (public.current_user_role() = 'admin'::public.user_role or (public.current_user_role() = 'tech'::public.user_role and mechanic_id = (select auth.uid())))
with check (public.current_user_role() = 'admin'::public.user_role or (public.current_user_role() = 'tech'::public.user_role and mechanic_id = (select auth.uid())));

create or replace function public.claim_booking_for_current_tech(p_reference text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_detail public.mechanic_details%rowtype;
  v_reference text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() is distinct from 'tech'::public.user_role then raise exception 'Only approved technicians can claim jobs'; end if;
  select * into v_detail from public.mechanic_details where profile_id = v_user;
  if v_detail.w9_completed_at is null or not coalesce(v_detail.tax_id_provided, false) then raise exception 'Complete Stripe tax ID verification before claiming a job'; end if;
  if v_detail.contractor_agreement_signed_at is null or v_detail.contractor_agreement_signature_path is null then raise exception 'Sign the Independent Contractor Agreement before claiming a job'; end if;
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

do $$ begin perform cron.unschedule('sync-tech-tax-status-daily'); exception when others then null; end $$;
select cron.schedule('sync-tech-tax-status-daily', '17 6 * * *', $schedule$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_project_url' limit 1) || '/functions/v1/sync-tech-tax-status',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_anon_key' limit 1),'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_cleanup_cron_secret' limit 1)),
    body := '{}'::jsonb
  );
$schedule$);
