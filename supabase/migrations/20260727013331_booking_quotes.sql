-- Post-diagnostic repair quotes: tech submits → customer approves → capture

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quote_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS active_quote_id uuid,
  ADD COLUMN IF NOT EXISTS recommended_total_cents integer;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_quote_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_quote_status_check
  CHECK (
    quote_status = ANY (
      ARRAY[
        'none',
        'awaiting_diagnostic',
        'quote_pending',
        'quote_approved',
        'quote_declined'
      ]
    )
  );

CREATE TABLE IF NOT EXISTS public.booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles (id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status = ANY (
        ARRAY['draft', 'pending', 'approved', 'declined', 'superseded', 'expired']
      )
    ),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostic_fee_cents integer NOT NULL DEFAULT 10000,
  repairs_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL,
  tech_notes text,
  customer_note text,
  approved_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  capture_amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_quotes_one_open_per_booking
  ON public.booking_quotes (booking_id)
  WHERE status IN ('draft', 'pending');

CREATE INDEX IF NOT EXISTS booking_quotes_booking_id_idx ON public.booking_quotes (booking_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_active_quote_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_active_quote_id_fkey
      FOREIGN KEY (active_quote_id) REFERENCES public.booking_quotes (id);
  END IF;
END $$;

ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_quotes_select_related" ON public.booking_quotes;
CREATE POLICY "booking_quotes_select_related"
  ON public.booking_quotes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.mechanic_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

-- Extend public booking lookup for customer track UI
DROP FUNCTION IF EXISTS public.get_booking_by_reference(text);

CREATE OR REPLACE FUNCTION public.get_booking_by_reference(ref text)
RETURNS TABLE (
  id uuid,
  reference_code text,
  customer_name text,
  customer_phone text,
  customer_address text,
  zip_code text,
  vehicle_description text,
  services jsonb,
  total_estimate numeric,
  location_type public.location_type,
  status public.job_status,
  distance_miles numeric,
  eta_minutes integer,
  mechanic_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  payment_status text,
  hold_amount_cents integer,
  captured_amount_cents integer,
  dispatch_lat numeric,
  dispatch_lng numeric,
  quote_status text,
  recommended_total_cents integer,
  active_quote_id uuid,
  quote_line_items jsonb,
  quote_total_cents integer,
  quote_diagnostic_fee_cents integer,
  quote_repairs_cents integer,
  quote_tech_notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.reference_code,
    b.customer_name,
    b.customer_phone,
    b.customer_address,
    b.zip_code,
    b.vehicle_description,
    b.services,
    b.total_estimate,
    b.location_type,
    b.status,
    b.distance_miles,
    b.eta_minutes,
    b.mechanic_id,
    b.created_at,
    b.updated_at,
    b.payment_status,
    b.hold_amount_cents,
    b.captured_amount_cents,
    b.dispatch_lat,
    b.dispatch_lng,
    b.quote_status,
    b.recommended_total_cents,
    b.active_quote_id,
    q.line_items,
    q.total_cents,
    q.diagnostic_fee_cents,
    q.repairs_cents,
    q.tech_notes
  FROM public.bookings b
  LEFT JOIN public.booking_quotes q ON q.id = b.active_quote_id
  WHERE b.reference_code = trim(ref)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_reference(text) TO anon, authenticated;
