-- Allow approved-application promote RPCs to change profiles.role.
-- SECURITY DEFINER alone does not bypass profiles_guard_role (auth.role() stays authenticated).

CREATE OR REPLACE FUNCTION public.profiles_guard_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF coalesce(auth.role(), '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF coalesce(current_setting('adaptivity.bypass_role_guard', true), '') = 'on' THEN
      RETURN NEW;
    END IF;
    IF (SELECT public.current_user_role()) IS DISTINCT FROM 'admin'::public.user_role THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_approved_tech_application()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  app public.tech_applications%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO user_email FROM public.profiles WHERE id = uid;
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_email');
  END IF;

  SELECT * INTO app
  FROM public.tech_applications
  WHERE status = 'approved'
    AND profile_id IS NULL
    AND lower(email) = lower(user_email)
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_approved_application');
  END IF;

  PERFORM set_config('adaptivity.bypass_role_guard', 'on', true);

  UPDATE public.profiles
  SET
    role = 'tech'::public.user_role,
    full_name = coalesce(nullif(trim(full_name), ''), app.full_name),
    phone = coalesce(nullif(trim(phone), ''), app.phone)
  WHERE id = uid
    AND role IS DISTINCT FROM 'admin'::public.user_role;

  INSERT INTO public.mechanic_details (
    profile_id, van_number, role_title, specialties, job_capacity
  )
  VALUES (
    uid,
    'Mobile Unit',
    'ASE Technician',
    CASE
      WHEN app.specialties IS NULL OR cardinality(app.specialties) = 0
        THEN ARRAY['mechanical']::text[]
      ELSE app.specialties
    END,
    CASE WHEN app.job_capacity = 'standalone' THEN 'standalone' ELSE 'multi' END
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    specialties = excluded.specialties,
    job_capacity = excluded.job_capacity;

  UPDATE public.tech_applications
  SET profile_id = uid
  WHERE id = app.id;

  RETURN jsonb_build_object(
    'ok', true,
    'applicationId', app.id,
    'role', (SELECT role::text FROM public.profiles WHERE id = uid)
  );
END;
$$;

-- ensure_tech_profile: do not self-promote customer→tech (guard blocked it anyway).
-- Role comes from signup metadata, admin approve, or link_approved_tech_application.
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
  allowed text[] := ARRAY[
    'mechanical',
    'audio',
    'tint',
    'wrap',
    'bodywork',
    'modification',
    'detailing',
    'tires',
    'glass',
    'performance'
  ]::text[];
  current_role public.user_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO current_role FROM public.profiles WHERE id = uid;
  IF current_role IS DISTINCT FROM 'tech'::public.user_role
     AND current_role IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Technician profile required. Use an approved tech account or complete Join as Tech approval.';
  END IF;

  IF p_specialties IS NOT NULL THEN
    cleaned := ARRAY(
      SELECT DISTINCT u
      FROM unnest(p_specialties) AS u
      WHERE u = ANY (allowed)
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
    ELSIF cleaned = ARRAY['modification']::text[] THEN
      title := 'Modification Technician';
    ELSIF cleaned = ARRAY['detailing']::text[] THEN
      title := 'Detailing Technician';
    ELSIF cleaned = ARRAY['tires']::text[] THEN
      title := 'Tire Technician';
    ELSIF cleaned = ARRAY['glass']::text[] THEN
      title := 'Glass Technician';
    ELSIF cleaned = ARRAY['performance']::text[] THEN
      title := 'Performance Technician';
    ELSIF cardinality(cleaned) > 1 THEN
      title := 'Multi-Trade Technician';
    ELSE
      title := 'ASE Technician';
    END IF;
  END IF;

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
