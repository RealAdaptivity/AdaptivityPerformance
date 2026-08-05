-- Tech applications inbox (public apply → admin approve/reject)

CREATE TABLE IF NOT EXISTS public.tech_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  zip_code text,
  years_experience text,
  trades text[] NOT NULL DEFAULT ARRAY['mechanical']::text[],
  specialties text[] NOT NULL DEFAULT ARRAY['mechanical']::text[],
  ase_certs text[] NOT NULL DEFAULT '{}'::text[],
  tools jsonb NOT NULL DEFAULT '{}'::jsonb,
  has_vehicle boolean NOT NULL DEFAULT true,
  pay_preference text NOT NULL DEFAULT 'revshare'
    CHECK (pay_preference = ANY (ARRAY['revshare', 'hourly'])),
  job_capacity text NOT NULL DEFAULT 'multi'
    CHECK (job_capacity = ANY (ARRAY['multi', 'standalone'])),
  liability_accepted boolean NOT NULL DEFAULT false,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status = ANY (ARRAY['submitted', 'approved', 'rejected'])),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tech_applications_status_idx
  ON public.tech_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS tech_applications_email_idx
  ON public.tech_applications (lower(email));

ALTER TABLE public.tech_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tech_applications_anon_insert" ON public.tech_applications;
CREATE POLICY "tech_applications_anon_insert"
  ON public.tech_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tech_applications_admin_select" ON public.tech_applications;
CREATE POLICY "tech_applications_admin_select"
  ON public.tech_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "tech_applications_admin_update" ON public.tech_applications;
CREATE POLICY "tech_applications_admin_update"
  ON public.tech_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Promote / provision tech from an approved application when a profile already exists,
-- or mark approved and leave invitation instructions for portal signup.
CREATE OR REPLACE FUNCTION public.approve_tech_application(
  p_application_id uuid,
  p_mark_tools_verified boolean DEFAULT false,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  app public.tech_applications%ROWTYPE;
  target_id uuid;
  result_profile_linked boolean := false;
BEGIN
  IF uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO app
  FROM public.tech_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF app.status = 'approved' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyApproved', true,
      'profileLinked', app.profile_id IS NOT NULL,
      'profileId', app.profile_id
    );
  END IF;

  IF app.status = 'rejected' THEN
    RAISE EXCEPTION 'Application was rejected — cannot approve';
  END IF;

  SELECT p.id INTO target_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(app.email)
  LIMIT 1;

  IF target_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      role = 'tech'::public.user_role,
      full_name = coalesce(nullif(trim(full_name), ''), app.full_name),
      phone = coalesce(nullif(trim(phone), ''), app.phone)
    WHERE id = target_id
      AND role IS DISTINCT FROM 'admin'::public.user_role;

    INSERT INTO public.mechanic_details (
      profile_id,
      van_number,
      role_title,
      specialties,
      job_capacity,
      tools_verified
    )
    VALUES (
      target_id,
      'Mobile Unit',
      CASE
        WHEN cardinality(app.specialties) > 1 THEN 'Multi-Trade Technician'
        WHEN app.specialties = ARRAY['audio']::text[] THEN 'Audio Technician'
        WHEN app.specialties = ARRAY['tint']::text[] THEN 'Tint Technician'
        WHEN app.specialties = ARRAY['wrap']::text[] THEN 'Wrap Technician'
        WHEN app.specialties = ARRAY['bodywork']::text[] THEN 'Body Work Technician'
        WHEN app.specialties = ARRAY['modification']::text[] THEN 'Modification Technician'
        WHEN app.specialties = ARRAY['detailing']::text[] THEN 'Detailing Technician'
        WHEN app.specialties = ARRAY['tires']::text[] THEN 'Tire Technician'
        WHEN app.specialties = ARRAY['glass']::text[] THEN 'Glass Technician'
        WHEN app.specialties = ARRAY['performance']::text[] THEN 'Performance Technician'
        ELSE 'ASE Technician'
      END,
      CASE
        WHEN app.specialties IS NULL OR cardinality(app.specialties) = 0
          THEN ARRAY['mechanical']::text[]
        ELSE app.specialties
      END,
      CASE WHEN app.job_capacity = 'standalone' THEN 'standalone' ELSE 'multi' END,
      coalesce(p_mark_tools_verified, false)
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
      specialties = excluded.specialties,
      job_capacity = excluded.job_capacity,
      tools_verified = CASE
        WHEN p_mark_tools_verified THEN true
        ELSE mechanic_details.tools_verified
      END,
      role_title = coalesce(excluded.role_title, mechanic_details.role_title);

    result_profile_linked := true;
  END IF;

  UPDATE public.tech_applications
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = uid,
    profile_id = coalesce(target_id, profile_id),
    admin_notes = coalesce(nullif(trim(p_admin_notes), ''), admin_notes)
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyApproved', false,
    'profileLinked', result_profile_linked,
    'profileId', target_id,
    'email', app.email,
    'nextStep', CASE
      WHEN result_profile_linked THEN 'Linked existing account — tech can sign in to portal and finish Stripe/W-9.'
      ELSE 'No account yet — tell them to create a Tech account at /portal using this email.'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_tech_application(
  p_application_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.tech_applications
  SET
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = uid,
    admin_notes = coalesce(nullif(trim(p_admin_notes), ''), admin_notes)
  WHERE id = p_application_id
    AND status = 'submitted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already reviewed';
  END IF;
END;
$$;

-- After tech signup, attach any approved application matching email.
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

  RETURN jsonb_build_object('ok', true, 'applicationId', app.id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_tech_application(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_tech_application(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_approved_tech_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_tech_application(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_tech_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_approved_tech_application() TO authenticated;
