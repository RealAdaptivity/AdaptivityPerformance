-- Shop / garage partnerships: host locations that receive Adaptivity bookings

DO $$ BEGIN
  CREATE TYPE public.partner_status AS ENUM ('pending', 'approved', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.partner_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  business_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text NOT NULL,
  city text,
  state text DEFAULT 'TX',
  zip_code text,
  lat numeric,
  lng numeric,
  status public.partner_status NOT NULL DEFAULT 'pending',
  is_adaptivity_owned boolean NOT NULL DEFAULT false,
  host_jobs boolean NOT NULL DEFAULT true,
  has_lift boolean NOT NULL DEFAULT false,
  bay_count integer DEFAULT 1,
  hours_note text,
  amenities jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_share_pct integer DEFAULT 15,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  zip_code text,
  has_lift boolean NOT NULL DEFAULT false,
  bay_count integer,
  hours_note text,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status = ANY (ARRAY['submitted', 'reviewed', 'approved', 'rejected'])),
  reviewed_at timestamptz,
  partner_location_id uuid REFERENCES public.partner_locations (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS partner_location_id uuid
    REFERENCES public.partner_locations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partner_locations_status_idx ON public.partner_locations (status);
CREATE INDEX IF NOT EXISTS partner_applications_status_idx ON public.partner_applications (status);
CREATE INDEX IF NOT EXISTS bookings_partner_location_id_idx ON public.bookings (partner_location_id);

-- Seed Adaptivity Justin hub as first approved partner location
INSERT INTO public.partner_locations (
  business_name,
  contact_name,
  contact_email,
  address,
  city,
  state,
  zip_code,
  status,
  is_adaptivity_owned,
  host_jobs,
  has_lift,
  bay_count,
  hours_note
)
SELECT
  'Adaptivity Performance Garage',
  'Adaptivity Dispatch',
  'hello@adaptivityperformance.com',
  '410 FM 156, Justin, TX 76247',
  'Justin',
  'TX',
  '76247',
  'approved',
  true,
  true,
  true,
  2,
  'By appointment — shop drop-off & heavy repairs'
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_locations
  WHERE is_adaptivity_owned = true AND zip_code = '76247'
);

ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_locations_public_read_approved" ON public.partner_locations;
CREATE POLICY "partner_locations_public_read_approved"
  ON public.partner_locations FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' AND host_jobs = true);

DROP POLICY IF EXISTS "partner_locations_admin_all" ON public.partner_locations;
CREATE POLICY "partner_locations_admin_all"
  ON public.partner_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "partner_applications_anon_insert" ON public.partner_applications;
CREATE POLICY "partner_applications_anon_insert"
  ON public.partner_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "partner_applications_admin_select" ON public.partner_applications;
CREATE POLICY "partner_applications_admin_select"
  ON public.partner_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "partner_applications_admin_update" ON public.partner_applications;
CREATE POLICY "partner_applications_admin_update"
  ON public.partner_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
