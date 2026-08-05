-- Tech trade specialties: mechanical (ASE), audio, tint, wrap

ALTER TABLE public.mechanic_details
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT ARRAY['mechanical']::text[];

ALTER TABLE public.mechanic_details
  DROP CONSTRAINT IF EXISTS mechanic_details_specialties_check;

ALTER TABLE public.mechanic_details
  ADD CONSTRAINT mechanic_details_specialties_check
  CHECK (
    specialties <@ ARRAY['mechanical', 'audio', 'tint', 'wrap', 'bodywork']::text[]
    AND cardinality(specialties) >= 1
  );

UPDATE public.mechanic_details
SET specialties = ARRAY['mechanical']::text[]
WHERE specialties IS NULL OR cardinality(specialties) = 0;

DROP FUNCTION IF EXISTS public.ensure_tech_profile(text, text);
DROP FUNCTION IF EXISTS public.ensure_tech_profile(text, text, text[]);

CREATE OR REPLACE FUNCTION public.ensure_tech_profile(
  p_van_number text DEFAULT 'Mobile Unit',
  p_role_title text DEFAULT NULL,
  p_specialties text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cleaned text[];
  title text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_specialties IS NOT NULL THEN
    cleaned := ARRAY(
      SELECT DISTINCT u
      FROM unnest(p_specialties) AS u
      WHERE u = ANY (ARRAY['mechanical', 'audio', 'tint', 'wrap', 'bodywork']::text[])
    );
    IF cleaned IS NULL OR cardinality(cleaned) = 0 THEN
      cleaned := ARRAY['mechanical']::text[];
    END IF;
  END IF;

  title := nullif(trim(coalesce(p_role_title, '')), '');
  IF title IS NULL AND cleaned IS NOT NULL THEN
    IF cleaned = ARRAY['audio']::text[] THEN
      title := 'Audio Technician';
    ELSIF cleaned = ARRAY['tint']::text[] THEN
      title := 'Tint Technician';
    ELSIF cleaned = ARRAY['wrap']::text[] THEN
      title := 'Wrap Technician';
    ELSIF cleaned = ARRAY['bodywork']::text[] THEN
      title := 'Body Work Technician';
    ELSIF cardinality(cleaned) > 1 THEN
      title := 'Multi-Trade Technician';
    ELSE
      title := 'ASE Technician';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = 'tech'::public.user_role
  WHERE id = uid
    AND role IS DISTINCT FROM 'admin'::public.user_role;

  INSERT INTO public.mechanic_details (profile_id, van_number, role_title, specialties)
  VALUES (
    uid,
    coalesce(nullif(trim(p_van_number), ''), 'Mobile Unit'),
    coalesce(title, 'ASE Technician'),
    coalesce(cleaned, ARRAY['mechanical']::text[])
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    van_number = coalesce(nullif(excluded.van_number, ''), mechanic_details.van_number),
    role_title = coalesce(title, mechanic_details.role_title),
    specialties = coalesce(cleaned, mechanic_details.specialties);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_tech_profile(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_tech_profile(text, text, text[]) TO authenticated;
