-- 1. Two cron jobs were still calling edge functions that no longer exist,
--    because those functions went with Stripe. cleanup-expired-holds fired
--    every 15 minutes and sync-tech-tax-status daily; both would 404 forever
--    and fill the logs. Neither has anything to do any more: there are no card
--    holds to expire, and no Stripe account to read a tax status from.
select cron.unschedule(jobid) from cron.job
where command like '%functions/v1/cleanup-expired-holds%'
   or command like '%functions/v1/sync-tech-tax-status%';

-- 2. Seventeen SECURITY DEFINER functions were executable by `anon`. Each one
--    refuses internally — verified by calling them as an anonymous caller, all
--    refused — so this was not exploitable, but the grant was wider than the
--    function needs. Only two have any business being reachable signed-out:
--    get_booking_by_reference (guest tracking, now second-factor protected) and
--    has_admin_user (decides whether to show first-run admin setup).
revoke execute on function public.approve_tech_application(uuid, boolean, text) from anon;
revoke execute on function public.reject_tech_application(uuid, text) from anon;
revoke execute on function public.claim_booking_for_current_tech(text) from anon;
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.customer_credit_balance_cents() from anon;
revoke execute on function public.ensure_referral_code() from anon;
revoke execute on function public.ensure_tech_profile(text, text, text[]) from anon;
revoke execute on function public.mark_contractor_agreement_signed() from anon;
revoke execute on function public.set_my_job_capacity(text) from anon;
revoke execute on function public.sign_contractor_agreement(text, text, text, text) from anon;
revoke execute on function public.tech_w9_ready(uuid) from anon;
revoke execute on function public.upsert_device_push_token(text, text, text) from anon;

-- These three are trigger functions. A trigger fires as part of the table
-- operation and does not consult EXECUTE, so revoking here removes a pointless
-- RPC surface without affecting the triggers themselves.
revoke execute on function public.profiles_guard_role_column() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.link_approved_tech_application() from anon, authenticated;

-- 3. Dead Stripe storage.
--    payments_tech_select_own granted a tech access to payment rows by matching
--    their Connect account id. payments_tech_select_assigned_bookings already
--    grants the same rows by booking assignment, which is the better rule and
--    survives Stripe: checked against the data, zero rows are reachable only
--    through the Connect-account policy. Dropping it frees the column.
drop policy if exists payments_tech_select_own on public.payments;
alter table public.mechanic_details drop column if exists stripe_account_id;

--    stripe_webhook_events only ever held Stripe's webhook replay log and the
--    account it belonged to is closed.
--    public.payments is deliberately KEPT: those rows are real financial
--    history and are needed for tax records.
drop table if exists public.stripe_webhook_events;
