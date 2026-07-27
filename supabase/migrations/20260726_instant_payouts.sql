-- Instant / standard Connect payout tracking on job payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payout_id text,
  ADD COLUMN IF NOT EXISTS payout_method text CHECK (
    payout_method IS NULL OR payout_method = ANY (ARRAY['instant'::text, 'standard'::text])
  ),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_amount_cents integer,
  ADD COLUMN IF NOT EXISTS payout_error text;

DROP POLICY IF EXISTS payments_tech_select_own ON public.payments;
CREATE POLICY payments_tech_select_own
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    tech_stripe_account_id IS NOT NULL
    AND tech_stripe_account_id IN (
      SELECT md.stripe_account_id
      FROM public.mechanic_details md
      WHERE md.profile_id = auth.uid()
        AND md.stripe_account_id IS NOT NULL
    )
  );
