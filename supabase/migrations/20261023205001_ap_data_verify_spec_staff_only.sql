-- verify_vehicle_spec() already refuses anyone who is not staff, but as a
-- SECURITY DEFINER function it should not be callable signed out at all
-- (Supabase lint 0028). Signed-in users keep the explicit grant.
revoke execute on function public.verify_vehicle_spec(uuid) from public, anon;
grant execute on function public.verify_vehicle_spec(uuid) to authenticated;
