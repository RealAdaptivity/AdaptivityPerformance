-- Canceled jobs, GPS tracking RPC, RLS hardening, no self-serve admin signup

ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'CANCELED';

-- Signup: never grant admin from client metadata (admin via bootstrap-admin / service role only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
  resolved_role public.user_role;
BEGIN
  meta_role := new.raw_user_meta_data ->> 'role';
  resolved_role := CASE
    WHEN meta_role = 'tech' THEN 'tech'::public.user_role
    ELSE 'customer'::public.user_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    resolved_role
  );

  IF resolved_role = 'tech' THEN
    INSERT INTO public.mechanic_details (profile_id, van_number, role_title)
    VALUES (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'van_number', 'Mobile Unit'),
      coalesce(new.raw_user_meta_data ->> 'role_title', 'ASE Technician')
    );
  END IF;

  RETURN new;
END;
$$;

-- Block non-admins from changing their own role
CREATE OR REPLACE FUNCTION public.profiles_guard_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF (SELECT public.current_user_role()) IS DISTINCT FROM 'admin'::public.user_role THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_column();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Richer public tracker payload (reference lookup)
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
  dispatch_lng numeric
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
    b.dispatch_lng
  FROM public.bookings b
  WHERE upper(b.reference_code) = upper(ref)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_reference(text) TO anon, authenticated;
