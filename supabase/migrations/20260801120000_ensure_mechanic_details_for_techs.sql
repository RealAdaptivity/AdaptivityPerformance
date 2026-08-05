-- Tech profiles created before mechanic_details trigger (or role changes) need a row for Stripe upsert.
INSERT INTO public.mechanic_details (profile_id, van_number, role_title)
SELECT p.id, 'Mobile Unit', 'ASE Technician'
FROM public.profiles p
WHERE p.role = 'tech'::public.user_role
  AND NOT EXISTS (
    SELECT 1 FROM public.mechanic_details md WHERE md.profile_id = p.id
  );
