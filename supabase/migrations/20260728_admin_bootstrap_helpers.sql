-- Public check: is any dispatch admin provisioned? (no PII)
CREATE OR REPLACE FUNCTION public.has_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.has_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin_user() TO anon, authenticated;
