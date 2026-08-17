-- Digital contractor agreement signatures (typed name + drawn signature image).
ALTER TABLE public.mechanic_details
  ADD COLUMN IF NOT EXISTS contractor_agreement_signer_name text,
  ADD COLUMN IF NOT EXISTS contractor_agreement_signature_path text,
  ADD COLUMN IF NOT EXISTS contractor_agreement_version text,
  ADD COLUMN IF NOT EXISTS contractor_agreement_user_agent text;

CREATE TABLE IF NOT EXISTS public.contractor_agreement_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signature_path text NOT NULL,
  agreement_version text NOT NULL DEFAULT '2026-07-v1',
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_agreement_signatures_profile_idx
  ON public.contractor_agreement_signatures (profile_id, signed_at DESC);

ALTER TABLE public.contractor_agreement_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contractor_agreement_signatures_select_own ON public.contractor_agreement_signatures;
CREATE POLICY contractor_agreement_signatures_select_own
  ON public.contractor_agreement_signatures FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
    )
  );

DROP POLICY IF EXISTS contractor_agreement_signatures_insert_own ON public.contractor_agreement_signatures;
CREATE POLICY contractor_agreement_signatures_insert_own
  ON public.contractor_agreement_signatures FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-agreements',
  'contractor-agreements',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'text/html', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS contractor_agreements_select ON storage.objects;
CREATE POLICY contractor_agreements_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contractor-agreements'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
      )
    )
  );

DROP POLICY IF EXISTS contractor_agreements_insert ON storage.objects;
CREATE POLICY contractor_agreements_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contractor-agreements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

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
    uid, clean_name, clean_path, coalesce(nullif(trim(p_agreement_version), ''), '2026-07-v1'),
    nullif(trim(p_user_agent), ''), signed_at
  );

  UPDATE public.mechanic_details
  SET
    contractor_agreement_signed_at = coalesce(contractor_agreement_signed_at, signed_at),
    contractor_agreement_signer_name = clean_name,
    contractor_agreement_signature_path = clean_path,
    contractor_agreement_version = coalesce(nullif(trim(p_agreement_version), ''), '2026-07-v1'),
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
      signed_at, clean_name, clean_path,
      coalesce(nullif(trim(p_agreement_version), ''), '2026-07-v1'),
      nullif(trim(p_user_agent), '')
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
      contractor_agreement_signed_at = coalesce(public.mechanic_details.contractor_agreement_signed_at, EXCLUDED.contractor_agreement_signed_at),
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
