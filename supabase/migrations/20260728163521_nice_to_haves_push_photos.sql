-- Nice-to-haves: push tokens, job photos, tip tracking helpers

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text,
  role text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS device_push_tokens_profile_idx ON public.device_push_tokens (profile_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_push_tokens_own ON public.device_push_tokens;
CREATE POLICY device_push_tokens_own ON public.device_push_tokens
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.booking_job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  kind text NOT NULL DEFAULT 'dvi'
    CHECK (kind = ANY (ARRAY['before'::text, 'after'::text, 'dvi'::text, 'other'::text])),
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_job_photos_booking_idx ON public.booking_job_photos (booking_id);

ALTER TABLE public.booking_job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_job_photos_select ON public.booking_job_photos;
CREATE POLICY booking_job_photos_select ON public.booking_job_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.mechanic_id = auth.uid()
          OR public.current_user_role() = 'admin'::public.user_role
        )
    )
  );

DROP POLICY IF EXISTS booking_job_photos_insert ON public.booking_job_photos;
CREATE POLICY booking_job_photos_insert ON public.booking_job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.mechanic_id = auth.uid()
          OR public.current_user_role() = 'admin'::public.user_role
        )
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS job_photos_public_read ON storage.objects;
CREATE POLICY job_photos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'job-photos');

DROP POLICY IF EXISTS job_photos_auth_upload ON storage.objects;
CREATE POLICY job_photos_auth_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

DROP POLICY IF EXISTS job_photos_auth_update ON storage.objects;
CREATE POLICY job_photos_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'job-photos');

CREATE OR REPLACE FUNCTION public.upsert_device_push_token(
  p_token text,
  p_platform text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RAISE EXCEPTION 'Invalid push token';
  END IF;

  INSERT INTO public.device_push_tokens (profile_id, expo_push_token, platform, role, updated_at)
  VALUES (auth.uid(), trim(p_token), p_platform, p_role, now())
  ON CONFLICT (profile_id, expo_push_token)
  DO UPDATE SET
    platform = COALESCE(EXCLUDED.platform, device_push_tokens.platform),
    role = COALESCE(EXCLUDED.role, device_push_tokens.role),
    updated_at = now()
  RETURNING id INTO row_id;

  RETURN row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_device_push_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_device_push_token(text, text, text) TO authenticated;
