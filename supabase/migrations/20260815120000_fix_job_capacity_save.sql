-- Fix work-style (job_capacity) saves + harden role guard typing.

CREATE OR REPLACE FUNCTION public.profiles_guard_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Cast auth.role() to text — comparing name to user_role/enums blows up on some PG builds.
    IF coalesce(auth.role()::text, '') = 'service_role' THEN
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

CREATE OR REPLACE FUNCTION public.set_my_job_capacity(p_capacity text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cleaned text := lower(trim(coalesce(p_capacity, '')));
  current_role public.user_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF cleaned IS DISTINCT FROM 'multi' AND cleaned IS DISTINCT FROM 'standalone' THEN
    RAISE EXCEPTION 'job_capacity must be multi or standalone';
  END IF;

  SELECT role INTO current_role FROM public.profiles WHERE id = uid;
  IF current_role IS DISTINCT FROM 'tech'::public.user_role
     AND current_role IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Technician profile required';
  END IF;

  UPDATE public.mechanic_details
  SET job_capacity = cleaned
  WHERE profile_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Technician profile not found — finish tech signup first';
  END IF;

  RETURN cleaned;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_job_capacity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_job_capacity(text) TO authenticated;
