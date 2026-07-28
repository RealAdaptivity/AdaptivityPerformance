-- Preferred appointment schedule (keep card hold on reschedule).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS preferred_time_window text,
  ADD COLUMN IF NOT EXISTS customer_notes text;

COMMENT ON COLUMN public.bookings.preferred_date IS 'Customer preferred service date';
COMMENT ON COLUMN public.bookings.preferred_time_window IS 'Customer preferred time window / slot label';
COMMENT ON COLUMN public.bookings.customer_notes IS 'Optional customer notes (no longer stuffed into address)';

DROP FUNCTION IF EXISTS public.get_booking_by_reference(text);

CREATE FUNCTION public.get_booking_by_reference(ref text)
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
  quote_tech_notes text,
  preferred_date date,
  preferred_time_window text,
  customer_notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
    q.tech_notes,
    b.preferred_date,
    b.preferred_time_window,
    b.customer_notes
  FROM public.bookings b
  LEFT JOIN public.booking_quotes q ON q.id = b.active_quote_id
  WHERE b.reference_code = trim(ref)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_reference(text) TO anon, authenticated, service_role;
