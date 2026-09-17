-- Two mechanical performance fixes. Neither changes who can see what.
--
-- 1. RLS policies were calling auth.uid() once PER ROW.
--
-- Postgres can hoist a scalar subquery out of a row filter and evaluate it once
-- per statement, but only if it is written as one. `auth.uid() = customer_id`
-- re-runs the function for every row scanned; `(select auth.uid()) = customer_id`
-- runs it once. 33 policies across 22 tables were written the first way,
-- including every policy on bookings, payments and profiles — the tables the
-- customer and tech portals read on each load.
--
-- This is invisible at the current row counts and becomes the dominant cost as
-- bookings accumulate, so it is worth doing before it matters rather than after.
--
-- The rewrite is done from the live catalog rather than by restating 33 policy
-- bodies here, because restating them by hand is how a policy silently loses a
-- clause. The regexp only wraps the auth.* call and leaves everything else
-- exactly as it was; the negative lookbehind keeps already-wrapped calls from
-- being wrapped twice, so re-running this is a no-op.

DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  changed int := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual  := regexp_replace(pol.qual,       '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');
    new_check := regexp_replace(pol.with_check, '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');

    CONTINUE WHEN pol.qual IS NOT DISTINCT FROM new_qual
              AND pol.with_check IS NOT DISTINCT FROM new_check;

    EXECUTE format('ALTER POLICY %I ON %I.%I%s%s',
      pol.policyname, pol.schemaname, pol.tablename,
      CASE WHEN new_qual  IS NOT NULL THEN format(' USING (%s)', new_qual)      ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_check) ELSE '' END
    );
    changed := changed + 1;
  END LOOP;

  RAISE NOTICE 'rls_initplan: rewrote % policies', changed;
END $$;

-- 2. Foreign keys with no covering index.
--
-- Postgres indexes the primary key side of a foreign key, never the referencing
-- side. Every one of these columns is something the portals filter or join on —
-- bookings by mechanic, payments by booking, vehicles by owner — and each one is
-- a sequential scan today. They are also what makes a DELETE on the parent row
-- slow, because the constraint check has to scan the child table.
--
-- The tables are small, so these build instantly. IF NOT EXISTS keeps the
-- migration re-runnable.

CREATE INDEX IF NOT EXISTS booking_job_photos_uploaded_by_idx ON public.booking_job_photos (uploaded_by);
CREATE INDEX IF NOT EXISTS booking_quotes_submitted_by_idx ON public.booking_quotes (submitted_by);
CREATE INDEX IF NOT EXISTS bookings_active_quote_id_idx ON public.bookings (active_quote_id);
CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS bookings_mechanic_id_idx ON public.bookings (mechanic_id);
CREATE INDEX IF NOT EXISTS bookings_preferred_mechanic_id_idx ON public.bookings (preferred_mechanic_id);
CREATE INDEX IF NOT EXISTS bookings_vehicle_id_idx ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS customer_credits_booking_id_idx ON public.customer_credits (booking_id);
CREATE INDEX IF NOT EXISTS customer_credits_referral_redemption_id_idx ON public.customer_credits (referral_redemption_id);
CREATE INDEX IF NOT EXISTS customer_favorite_techs_tech_id_idx ON public.customer_favorite_techs (tech_id);
CREATE INDEX IF NOT EXISTS gbp_post_drafts_booking_id_idx ON public.gbp_post_drafts (booking_id);
CREATE INDEX IF NOT EXISTS inspection_reports_booking_id_idx ON public.inspection_reports (booking_id);
CREATE INDEX IF NOT EXISTS inspection_reports_inspector_profile_id_idx ON public.inspection_reports (inspector_profile_id);
CREATE INDEX IF NOT EXISTS inspection_reports_vehicle_id_idx ON public.inspection_reports (vehicle_id);
CREATE INDEX IF NOT EXISTS job_messages_sender_id_idx ON public.job_messages (sender_id);
CREATE INDEX IF NOT EXISTS mechanic_details_terminated_by_idx ON public.mechanic_details (terminated_by);
CREATE INDEX IF NOT EXISTS partner_applications_partner_location_id_idx ON public.partner_applications (partner_location_id);
CREATE INDEX IF NOT EXISTS partner_locations_owner_profile_id_idx ON public.partner_locations (owner_profile_id);
CREATE INDEX IF NOT EXISTS parts_expense_claims_booking_id_idx ON public.parts_expense_claims (booking_id);
CREATE INDEX IF NOT EXISTS parts_expense_claims_reviewed_by_idx ON public.parts_expense_claims (reviewed_by);
CREATE INDEX IF NOT EXISTS parts_expense_claims_tech_id_idx ON public.parts_expense_claims (tech_id);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS referral_redemptions_booking_id_idx ON public.referral_redemptions (booking_id);
CREATE INDEX IF NOT EXISTS referral_redemptions_referral_code_id_idx ON public.referral_redemptions (referral_code_id);
CREATE INDEX IF NOT EXISTS referral_redemptions_referred_profile_id_idx ON public.referral_redemptions (referred_profile_id);
CREATE INDEX IF NOT EXISTS tech_applications_profile_id_idx ON public.tech_applications (profile_id);
CREATE INDEX IF NOT EXISTS tech_applications_reviewed_by_idx ON public.tech_applications (reviewed_by);
CREATE INDEX IF NOT EXISTS vehicles_owner_id_idx ON public.vehicles (owner_id);
CREATE INDEX IF NOT EXISTS warranty_claims_booking_id_idx ON public.warranty_claims (booking_id);
CREATE INDEX IF NOT EXISTS warranty_claims_customer_id_idx ON public.warranty_claims (customer_id);
