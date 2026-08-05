-- Track Connect transfer id per payment for idempotent retries after capture.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

CREATE INDEX IF NOT EXISTS payments_stripe_transfer_id_idx
  ON public.payments (stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;
