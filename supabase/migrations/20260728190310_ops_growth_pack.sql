-- Ops + growth pack: referrals, cancel reasons, parts expenses, blog stubs

-- Cancel / no-show structured reasons
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS no_show_reason text,
  ADD COLUMN IF NOT EXISTS referral_code_used text;

COMMENT ON COLUMN public.bookings.cancel_reason IS 'Customer/admin cancel reason code';
COMMENT ON COLUMN public.bookings.no_show_reason IS 'Tech/admin no-show reason code';
COMMENT ON COLUMN public.bookings.referral_code_used IS 'Referral code applied at booking';

-- Referral program ($25 / $25 style credits tracked in cents)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  credit_cents integer NOT NULL DEFAULT 2500,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes (id) ON DELETE CASCADE,
  referred_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  referrer_credit_cents integer NOT NULL DEFAULT 2500,
  referred_credit_cents integer NOT NULL DEFAULT 2500,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending', 'earned', 'paid', 'void'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  earned_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  reason text NOT NULL,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  referral_redemption_id uuid REFERENCES public.referral_redemptions (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_codes_profile_idx ON public.referral_codes (profile_id);
CREATE INDEX IF NOT EXISTS customer_credits_profile_idx ON public.customer_credits (profile_id);

-- Parts expense / reimbursement claims (tech → admin)
CREATE TABLE IF NOT EXISTS public.parts_expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  tech_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  description text NOT NULL,
  receipt_path text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status = ANY (ARRAY['submitted', 'approved', 'rejected', 'reimbursed'])),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_expense_claims_status_idx
  ON public.parts_expense_claims (status, created_at DESC);

-- Lightweight blog posts (static-ish CMS)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body_md text NOT NULL,
  city_slug text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure every customer/tech can have a referral code
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  generated text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT code INTO existing
  FROM public.referral_codes
  WHERE profile_id = uid AND active = true
  LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  generated := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.referral_codes (profile_id, code)
  VALUES (uid, generated)
  ON CONFLICT (code) DO NOTHING;

  SELECT code INTO existing
  FROM public.referral_codes
  WHERE profile_id = uid AND active = true
  LIMIT 1;

  RETURN existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_credit_balance_cents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT coalesce(sum(amount_cents), 0)::integer INTO bal
  FROM public.customer_credits
  WHERE profile_id = uid;
  RETURN bal;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_credit_balance_cents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_credit_balance_cents() TO authenticated;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_codes_own ON public.referral_codes;
CREATE POLICY referral_codes_own ON public.referral_codes
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS referral_codes_insert_own ON public.referral_codes;
CREATE POLICY referral_codes_insert_own ON public.referral_codes
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS customer_credits_own ON public.customer_credits;
CREATE POLICY customer_credits_own ON public.customer_credits
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS referral_redemptions_admin ON public.referral_redemptions;
CREATE POLICY referral_redemptions_admin ON public.referral_redemptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS parts_expense_tech ON public.parts_expense_claims;
CREATE POLICY parts_expense_tech ON public.parts_expense_claims
  FOR ALL TO authenticated
  USING (
    tech_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    tech_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS blog_public_read ON public.blog_posts;
CREATE POLICY blog_public_read ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS blog_admin_all ON public.blog_posts;
CREATE POLICY blog_admin_all ON public.blog_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Seed starter blog posts
INSERT INTO public.blog_posts (slug, title, excerpt, body_md, city_slug, published, published_at)
SELECT * FROM (VALUES
  (
    'how-much-do-brakes-cost-northlake-tx',
    'How much do brakes cost in Northlake, TX?',
    'Ballpark mobile brake pricing for Canyon Falls, Harvest, and Pecan Square — plus how our $100 diagnostic hold works.',
    E'# How much do brakes cost in Northlake, TX?\n\nMost driveway brake jobs in Northlake (pads + rotors, one axle) land in a transparent labor + parts range after we inspect on site.\n\n## How Adaptivity prices\n\n1. Book a **$100 diagnostic hold**\n2. Tech inspects at your driveway\n3. You agree on labor + parts before we charge\n\nTravel inside our free radius (Justin hub) is $0.\n\n## Book mobile brakes\n\nCall (214) 620-3244 or book online for Northlake / Canyon Falls / Harvest.',
    'northlake',
    true,
    now()
  ),
  (
    'mobile-mechanic-vs-dealership-justin-tx',
    'Mobile mechanic vs dealership in Justin, TX',
    'When driveway service saves you a day — and when the Justin shop hub is the better call.',
    E'# Mobile mechanic vs dealership in Justin, TX\n\nDealerships are great for warranty coding and major powertrain work. For brakes, batteries, oil, and diagnostics, a mobile tech at your Justin driveway is usually faster.\n\n## When to choose mobile\n\n- You need brakes / oil / battery today\n- You do not want to sit in a waiting room\n- You want on-site pricing with a $100 hold\n\n## When to choose the Justin shop\n\n- Lifts, exhaust, major engine / transmission\n- Multi-day builds\n\nBook at adaptivityperformance.com or call (214) 620-3244.',
    'justin',
    true,
    now()
  ),
  (
    'google-business-review-playbook',
    'Google Business review playbook for Adaptivity',
    'Internal growth checklist: ask for reviews, reply fast, post weekly.',
    E'# Google Business review playbook\n\n1. After every completed job, send the review link\n2. Reply to every review within 48 hours\n3. Post a weekly Google Business update (photo from a job + city keyword)\n4. Keep NAP consistent: 410 FM 156, Justin TX 76247 · (214) 620-3244\n\nReview URL: set VITE_GOOGLE_REVIEW_URL in production.',
    null,
    true,
    now()
  )
) AS v(slug, title, excerpt, body_md, city_slug, published, published_at)
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts b WHERE b.slug = v.slug);
