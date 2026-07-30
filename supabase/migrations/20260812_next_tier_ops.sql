-- Next-tier ops: credits at capture, chat, favorites, warranty, schedule blocks, growth queues

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_applied_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_mechanic_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_ask_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_ask_sent_at timestamptz;

COMMENT ON COLUMN public.bookings.hold_expires_at IS 'When unused diagnostic hold should be released (default +7d from create)';
COMMENT ON COLUMN public.bookings.credit_applied_cents IS 'Referral/account credit applied at capture (refunded to customer)';
COMMENT ON COLUMN public.bookings.preferred_mechanic_id IS 'Customer requested same tech (soft preference for dispatch)';

CREATE TABLE IF NOT EXISTS public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_messages_booking_idx
  ON public.job_messages (booking_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.customer_favorite_techs (
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tech_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tech_id)
);

CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open', 'in_review', 'resolved', 'closed'])),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS warranty_claims_status_idx
  ON public.warranty_claims (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tech_unavailable_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS tech_unavailable_windows_tech_idx
  ON public.tech_unavailable_windows (tech_id, starts_at);

CREATE TABLE IF NOT EXISTS public.tech_inventory_checks (
  tech_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  specialty text NOT NULL,
  checked_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tech_id, specialty)
);

CREATE TABLE IF NOT EXISTS public.gbp_post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  caption text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft', 'copied', 'posted', 'dismissed'])),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gbp_post_drafts_status_idx
  ON public.gbp_post_drafts (status, created_at DESC);

-- Backfill hold expiry for open holds without one
UPDATE public.bookings
SET hold_expires_at = created_at + interval '7 days'
WHERE hold_expires_at IS NULL
  AND payment_status IN ('requires_capture', 'authorized', 'hold')
  AND status NOT IN ('COMPLETED', 'CANCELED');

-- RLS
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_favorite_techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_unavailable_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gbp_post_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_messages_participants ON public.job_messages;
CREATE POLICY job_messages_participants ON public.job_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.mechanic_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.mechanic_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS favorite_techs_own ON public.customer_favorite_techs;
CREATE POLICY favorite_techs_own ON public.customer_favorite_techs
  FOR ALL TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS warranty_claims_access ON public.warranty_claims;
CREATE POLICY warranty_claims_access ON public.warranty_claims
  FOR ALL TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS tech_unavailable_own ON public.tech_unavailable_windows;
CREATE POLICY tech_unavailable_own ON public.tech_unavailable_windows
  FOR ALL TO authenticated
  USING (
    tech_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (tech_id = auth.uid());

DROP POLICY IF EXISTS tech_inventory_own ON public.tech_inventory_checks;
CREATE POLICY tech_inventory_own ON public.tech_inventory_checks
  FOR ALL TO authenticated
  USING (
    tech_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (tech_id = auth.uid());

DROP POLICY IF EXISTS gbp_drafts_admin ON public.gbp_post_drafts;
CREATE POLICY gbp_drafts_admin ON public.gbp_post_drafts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
