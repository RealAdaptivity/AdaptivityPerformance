-- Allow service_role (edge bootstrap) to change profiles.role; keep blocking self-serve role escalation.
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
    IF (SELECT public.current_user_role()) IS DISTINCT FROM 'admin'::public.user_role THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Explicit promote helper for bootstrap-admin edge function
CREATE OR REPLACE FUNCTION public.promote_profile_to_admin(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin'::public.user_role
  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_profile_to_admin(uuid) FROM PUBLIC;
