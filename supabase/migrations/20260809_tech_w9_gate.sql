-- W-9 / tax ID gate before first job claim (TIN stays in Stripe Connect, not our DB).
ALTER TABLE public.mechanic_details
  ADD COLUMN IF NOT EXISTS w9_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS tax_id_provided boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.mechanic_details.w9_completed_at IS
  'Set when tech completed IRS W-9 / tax ID collection (via Stripe Connect). Required before claiming jobs.';
COMMENT ON COLUMN public.mechanic_details.tax_id_provided IS
  'Cached from Stripe Connect: individual/company tax ID has been submitted.';

CREATE OR REPLACE FUNCTION public.tech_w9_ready(p_profile_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mechanic_details md
    WHERE md.profile_id = p_profile_id
      AND md.w9_completed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.tech_w9_ready(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tech_w9_ready(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_tech_w9_complete()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'tech'::public.user_role
     AND public.current_user_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only technicians can complete W-9';
  END IF;

  UPDATE public.mechanic_details
  SET w9_completed_at = coalesce(w9_completed_at, now()),
      tax_id_provided = true
  WHERE profile_id = auth.uid()
  RETURNING w9_completed_at INTO completed_at;

  IF completed_at IS NULL THEN
    RAISE EXCEPTION 'Technician profile not found — finish tech signup first';
  END IF;

  RETURN completed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_tech_w9_complete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_tech_w9_complete() TO authenticated;
