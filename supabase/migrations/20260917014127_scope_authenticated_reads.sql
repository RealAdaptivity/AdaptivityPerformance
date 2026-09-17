-- Signed-in users could read every profile, every payment and every mechanic
-- record in the business.
--
-- profiles_select_authenticated, payments_select_authenticated and
-- mechanic_details_select_authenticated were all `USING (true)` for role
-- `authenticated`. Anyone who created a customer account on the public site
-- could then call /rest/v1/profiles?select=* with their own token and read every
-- other customer's name, email and phone, every payment row, and every
-- technician's Stripe account id, W-9 state and termination notes.
--
-- Demonstrated against this database before the change, acting as the existing
-- customer account inside a rolled-back transaction: 4 other people's emails,
-- 2 phone numbers, 2 technician Stripe account ids and the full payment total
-- were all readable.
--
-- Anonymous visitors were never exposed — every count is 0 signed out. This is
-- specifically an authenticated-user boundary, so the fix is to scope each
-- policy to what that user legitimately needs:
--
--   own row, always
--   staff (admin, and tech for profiles) keep operational visibility, because
--     the dispatch board shows customer contact details for unassigned jobs
--   a customer additionally sees the technician assigned to their own booking,
--     and the payments on their own bookings
--
-- Verified in a rolled-back transaction, for every existing account and for a
-- customer given a booking with an assigned tech:
--
--   customer  profiles 5 -> 1, payments 2 -> 0, mechanic_details all -> 0
--   customer with a job: own booking visible, assigned tech's name and record
--     readable, own payment readable, other customers' emails 0
--   tech and admin unchanged
--
-- Techs still read all profiles. That is broader than one job needs, but it is
-- how the dispatch board works today; narrowing it is a product change, not a
-- policy tweak, and is left alone deliberately.

ALTER POLICY profiles_select_authenticated ON public.profiles
  USING (
    id = (select auth.uid())
    OR (select public.current_user_role()) = ANY (ARRAY['admin','tech']::public.user_role[])
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.customer_id = (select auth.uid()) AND b.mechanic_id = profiles.id
    )
  );

ALTER POLICY payments_select_authenticated ON public.payments
  USING (
    (select public.current_user_role()) = 'admin'::public.user_role
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id AND b.customer_id = (select auth.uid())
    )
  );

ALTER POLICY mechanic_details_select_authenticated ON public.mechanic_details
  USING (
    profile_id = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'::public.user_role
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.customer_id = (select auth.uid()) AND b.mechanic_id = mechanic_details.profile_id
    )
  );
