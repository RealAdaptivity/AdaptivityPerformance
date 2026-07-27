-- Track Stripe refund + Connect transfer reversal for admin support paths
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_reversal_id text;

CREATE INDEX IF NOT EXISTS payments_stripe_refund_id_idx
  ON public.payments (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;
