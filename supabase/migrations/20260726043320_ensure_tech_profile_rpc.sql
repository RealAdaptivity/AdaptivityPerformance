-- Lets authenticated users register as dispatchable techs (role + mechanic_details).
-- Safe for self-only: uses auth.uid(). SECURITY DEFINER bypasses profiles role guard.
CREATE OR REPLACE FUNCTION public.ensure_tech_profile(
  p_van_number text DEFAULT 'Mobile Unit',
  p_role_title text DEFAULT 'ASE Technician'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET role = 'tech'::public.user_role
  WHERE id = uid
    AND role IS DISTINCT FROM 'admin'::public.user_role;

  INSERT INTO public.mechanic_details (profile_id, van_number, role_title)
  VALUES (
    uid,
    coalesce(nullif(trim(p_van_number), ''), 'Mobile Unit'),
    coalesce(nullif(trim(p_role_title), ''), 'ASE Technician')
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    van_number = coalesce(nullif(excluded.van_number, ''), mechanic_details.van_number),
    role_title = coalesce(nullif(excluded.role_title, ''), mechanic_details.role_title);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_tech_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_tech_profile(text, text) TO authenticated;

-- One-time: anyone with mechanic_details is a tech; fix mis-labeled customer accounts.
UPDATE public.profiles p
SET role = 'tech'::public.user_role
WHERE p.role = 'customer'::public.user_role
  AND EXISTS (
    SELECT 1 FROM public.mechanic_details md WHERE md.profile_id = p.id
  );

-- Backfill mechanic_details for role=tech profiles missing a row.
INSERT INTO public.mechanic_details (profile_id, van_number, role_title)
SELECT p.id, 'Mobile Unit', 'ASE Technician'
FROM public.profiles p
WHERE p.role = 'tech'::public.user_role
  AND NOT EXISTS (
    SELECT 1 FROM public.mechanic_details md WHERE md.profile_id = p.id
  );
