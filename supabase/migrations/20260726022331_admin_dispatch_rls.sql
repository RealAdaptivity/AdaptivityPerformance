-- Admin dispatch console: read fleet data + manage bookings (website /admin)

DROP POLICY IF EXISTS bookings_admin_select ON public.bookings;
CREATE POLICY bookings_admin_select
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS bookings_admin_update ON public.bookings;
CREATE POLICY bookings_admin_update
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS payments_admin_select ON public.payments;
CREATE POLICY payments_admin_select
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS mechanic_details_admin_select ON public.mechanic_details;
CREATE POLICY mechanic_details_admin_select
  ON public.mechanic_details
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin'::public.user_role);
