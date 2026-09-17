-- Let the owner set the shop labor rate without a code change.
--
-- app_config had a read policy for authenticated and no write policy at all, so
-- only service_role could change anything in it. Admins get write access, scoped
-- the same way as the policies tightened earlier today.
DROP POLICY IF EXISTS app_config_admin_write ON public.app_config;
CREATE POLICY app_config_admin_write ON public.app_config
  FOR ALL TO authenticated
  USING ((select public.current_user_role()) = 'admin'::public.user_role)
  WITH CHECK ((select public.current_user_role()) = 'admin'::public.user_role);

INSERT INTO public.app_config (key, value)
VALUES ('default_labor_rate_cents', '12500')
ON CONFLICT (key) DO NOTHING;
