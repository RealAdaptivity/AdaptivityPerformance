-- Contractor agreement acceptance (liability + workers’ comp + tax terms).
ALTER TABLE public.mechanic_details
  ADD COLUMN IF NOT EXISTS contractor_agreement_signed_at timestamptz;

COMMENT ON COLUMN public.mechanic_details.contractor_agreement_signed_at IS
  'When the tech electronically accepted the independent contractor agreement.';

CREATE OR REPLACE FUNCTION public.mark_contractor_agreement_signed()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signed_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'tech'::public.user_role
     AND public.current_user_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only technicians can sign the contractor agreement';
  END IF;

  UPDATE public.mechanic_details
  SET contractor_agreement_signed_at = coalesce(contractor_agreement_signed_at, now())
  WHERE profile_id = auth.uid()
  RETURNING contractor_agreement_signed_at INTO signed_at;

  IF signed_at IS NULL THEN
    RAISE EXCEPTION 'Technician profile not found — finish tech signup first';
  END IF;

  RETURN signed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_contractor_agreement_signed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_contractor_agreement_signed() TO authenticated;
