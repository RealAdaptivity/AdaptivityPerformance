-- Card hold at booking + capture on job completion
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hold_amount_cents integer,
  ADD COLUMN IF NOT EXISTS captured_amount_cents integer;

CREATE INDEX IF NOT EXISTS bookings_payment_intent_id_idx ON public.bookings (payment_intent_id);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check CHECK (
    status = ANY (
      ARRAY['pending'::text, 'authorized'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text]
    )
  );
