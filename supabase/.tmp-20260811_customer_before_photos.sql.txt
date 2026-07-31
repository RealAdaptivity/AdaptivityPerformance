-- Allow customers to upload "before" photos while tech has not arrived yet.

DROP POLICY IF EXISTS booking_job_photos_insert ON public.booking_job_photos;
CREATE POLICY booking_job_photos_insert ON public.booking_job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.mechanic_id = auth.uid()
          OR public.current_user_role() = 'admin'::public.user_role
          OR (
            b.customer_id = auth.uid()
            AND kind = 'before'
            AND b.status = ANY (ARRAY['UNASSIGNED'::public.job_status, 'EN_ROUTE'::public.job_status])
          )
        )
    )
  );
