-- Standalone customer quotes, written in the dispatch admin portal.
--
-- Deliberately NOT booking_quotes. That table requires a booking_id and belongs
-- to the quote-approval flow that was abandoned — submit_booking_quote now just
-- forwards to captureBookingPayment and approve_booking_quote is marked
-- deprecated ("tech charges on site"). A quote for someone who phones in has no
-- booking to attach to, so it needs its own home.

CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Q-1001, Q-1002 … what the customer sees and quotes it back to you on.
  quote_number text NOT NULL UNIQUE DEFAULT ('Q-' || nextval('public.quote_number_seq')::text),

  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_address text,
  vehicle text,

  -- [{ title, laborDollars, partsDollars, note }] — the same shape the tech
  -- charge flow and receiptPdf already use, so a quote can be re-used as an
  -- invoice later without a translation layer.
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Cents, to match every other money column in this schema.
  labor_cents integer NOT NULL DEFAULT 0,
  parts_cents integer NOT NULL DEFAULT 0,
  -- 'parts' (Texas: separately-stated repair labour is not taxed), 'total', or 'none'.
  tax_mode text NOT NULL DEFAULT 'parts' CHECK (tax_mode IN ('parts','total','none')),
  tax_rate_basis_points integer NOT NULL DEFAULT 825,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,

  notes text,
  valid_until date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','declined','expired')),

  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON public.quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes (status);
CREATE INDEX IF NOT EXISTS quotes_created_by_idx ON public.quotes (created_by);

DROP TRIGGER IF EXISTS quotes_set_updated_at ON public.quotes;
CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Admin-only, and scoped from the start. A quote holds a prospect's name, phone,
-- email and home address, so it gets the same treatment the authenticated-read
-- policies were just tightened to: no `USING (true)`, and auth.uid() wrapped in
-- a scalar subquery so it is evaluated once per statement rather than per row.
DROP POLICY IF EXISTS quotes_admin_all ON public.quotes;
CREATE POLICY quotes_admin_all ON public.quotes
  FOR ALL TO authenticated
  USING ((select public.current_user_role()) = 'admin'::public.user_role)
  WITH CHECK ((select public.current_user_role()) = 'admin'::public.user_role);
