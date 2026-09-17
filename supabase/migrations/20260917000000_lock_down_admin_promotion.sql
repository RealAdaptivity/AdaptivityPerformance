-- Close the anon path to promote_profile_to_admin, and pin two mutable search_paths.
--
-- promote_profile_to_admin(uuid) contains no authorization check at all:
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = target_id;
--
-- and EXECUTE was granted to anon and authenticated, so it is reachable from
-- /rest/v1/rpc/promote_profile_to_admin with nothing but the publishable key,
-- which ships in the JS bundle.
--
-- It is NOT currently exploitable: the profiles_guard_role BEFORE UPDATE trigger
-- reverts NEW.role for any caller that is not service_role and not already an
-- admin. Verified against this database by running the escalation as an
-- anonymous caller inside a rolled-back transaction — the role came back
-- unchanged ('tech' before, 'tech' after).
--
-- It is still wrong to leave open. The whole defence is one trigger, and it
-- fails silently: the UPDATE reports success while doing nothing, so a
-- regression here would be invisible. The only legitimate caller is the
-- bootstrap-admin Edge Function, which uses the service_role key and is
-- unaffected by revoking the two public roles.

REVOKE EXECUTE ON FUNCTION public.promote_profile_to_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_profile_to_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_profile_to_admin(uuid) FROM PUBLIC;

-- Defence in depth: refuse outright unless the caller is service_role or an
-- existing admin, so the function is safe even if the trigger is ever dropped.
-- The bootstrap path runs as service_role with no JWT subject, so it still
-- works when no admin exists yet.
CREATE OR REPLACE FUNCTION public.promote_profile_to_admin(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role()::text, '') IS DISTINCT FROM 'service_role'
     AND (SELECT public.current_user_role()) IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only an administrator or the service role may grant admin';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'::public.user_role
  WHERE id = target_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.promote_profile_to_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_profile_to_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.promote_profile_to_admin(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_profile_to_admin(uuid) TO service_role;

-- A function without a pinned search_path resolves unqualified names against
-- whatever the caller's search_path happens to be, which is a shadowing risk in
-- a SECURITY DEFINER context. Neither of these is security definer today, but
-- pinning costs nothing and removes the advisory.
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.generate_booking_reference() SET search_path TO 'public';
