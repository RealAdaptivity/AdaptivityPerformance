-- Techs can see payments for jobs assigned to them (not only when tech_stripe_account_id matches).
CREATE POLICY payments_tech_select_assigned_bookings
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND b.mechanic_id = auth.uid()
    )
  );
