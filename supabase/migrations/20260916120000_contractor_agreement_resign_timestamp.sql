-- Re-signing must record the date of the NEW signature.
--
-- sign_contractor_agreement wrote
--   contractor_agreement_signed_at = coalesce(contractor_agreement_signed_at, signed_at)
-- which keeps the FIRST signing date forever. That was harmless while there was
-- only one version of the agreement. Now that a version bump forces every
-- contractor to re-sign, it means a contractor who signs 2026-09-v2 today has
-- their v2 acceptance filed under the date they signed v1 — including on the PDF
-- they are handed as their copy, which pairs the new terms with the old date.
--
-- The signed_at column now tracks the signature it sits beside, matching the
-- version, signer name and signature path columns that are already overwritten.
-- Per-signature history is unaffected: contractor_agreement_signatures keeps one
-- immutable row per signing event and remains the audit trail.

CREATE OR REPLACE FUNCTION public.sign_contractor_agreement(
  p_signer_name text,
  p_signature_path text,
  p_user_agent text DEFAULT NULL,
  p_agreement_version text DEFAULT '2026-07-v1'
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  signed_at timestamptz := now();
  clean_name text := nullif(trim(p_signer_name), '');
  clean_path text := nullif(trim(p_signature_path), '');
  clean_version text := coalesce(nullif(trim(p_agreement_version), ''), '2026-07-v1');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.current_user_role() IS DISTINCT FROM 'tech'::public.user_role
     AND public.current_user_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only technicians can sign the contractor agreement';
  END IF;
  IF clean_name IS NULL OR length(clean_name) < 2 THEN
    RAISE EXCEPTION 'Full legal name is required';
  END IF;
  IF clean_path IS NULL OR position(uid::text in clean_path) <> 1 THEN
    RAISE EXCEPTION 'Invalid signature file path';
  END IF;

  INSERT INTO public.contractor_agreement_signatures (
    profile_id, signer_name, signature_path, agreement_version, user_agent, signed_at
  ) VALUES (
    uid, clean_name, clean_path, clean_version, nullif(trim(p_user_agent), ''), signed_at
  );

  UPDATE public.mechanic_details
  SET
    contractor_agreement_signed_at = signed_at,
    contractor_agreement_signer_name = clean_name,
    contractor_agreement_signature_path = clean_path,
    contractor_agreement_version = clean_version,
    contractor_agreement_user_agent = nullif(trim(p_user_agent), '')
  WHERE profile_id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.mechanic_details (
      profile_id, van_number, role_title,
      contractor_agreement_signed_at, contractor_agreement_signer_name,
      contractor_agreement_signature_path, contractor_agreement_version,
      contractor_agreement_user_agent
    ) VALUES (
      uid, 'Mobile Unit', 'Technician',
      signed_at, clean_name, clean_path, clean_version,
      nullif(trim(p_user_agent), '')
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
      contractor_agreement_signed_at = EXCLUDED.contractor_agreement_signed_at,
      contractor_agreement_signer_name = EXCLUDED.contractor_agreement_signer_name,
      contractor_agreement_signature_path = EXCLUDED.contractor_agreement_signature_path,
      contractor_agreement_version = EXCLUDED.contractor_agreement_version,
      contractor_agreement_user_agent = EXCLUDED.contractor_agreement_user_agent;
  END IF;

  RETURN signed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_contractor_agreement(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_contractor_agreement(text, text, text, text) TO authenticated;
