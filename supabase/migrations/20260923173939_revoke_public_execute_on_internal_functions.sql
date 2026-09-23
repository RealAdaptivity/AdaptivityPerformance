-- The previous migration revoked these from `anon` and nothing changed, because
-- the grant was to PUBLIC rather than to anon specifically. Revoking from anon
-- does not remove a PUBLIC grant.
--
-- current_user_role is called by 18 RLS policies, so authenticated must keep
-- EXECUTE or ordinary reads would start failing. Checked first: none of those
-- 18 policies applies to the anon role or to PUBLIC, so anon losing it breaks
-- nothing.
revoke execute on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, service_role;

-- Trigger functions. A trigger fires as part of the table operation and never
-- consults EXECUTE, so removing the grant entirely closes the pointless RPC
-- surface without affecting the triggers.
revoke execute on function public.profiles_guard_role_column() from public;
revoke execute on function public.rls_auto_enable() from public;
