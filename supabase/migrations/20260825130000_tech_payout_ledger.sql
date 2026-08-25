-- A ledger for what each tech has earned.
--
-- Stripe Connect made the payout implicit: capture a job, transfer 70% to the
-- tech's Express account, done. That platform is closed, so the obligation now
-- has to live somewhere explicit. This table is that somewhere — one row per
-- completed job recording what the tech earned, which an admin settles in a
-- batch and marks paid here.
--
-- PayPal does have a Payouts API, so this is not a permanent ceiling the way it
-- would have been on a processor without one. It is the faster path: paying out
-- through PayPal requires every tech to hold a PayPal account, and waiting on
-- that would block taking customer money at all. The ledger works on day one,
-- and automated payouts can be layered on top of it later without changing how
-- the share is calculated.
--
-- The tech's 70% share is still computed exactly as before by
-- _shared/revenueSplit.ts. Only the settlement changes: recorded as a debt owed
-- rather than transferred on the spot.

create table if not exists public.tech_payouts (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid references public.bookings (id) on delete set null,
  -- Denormalized so a payout stays legible in an export even if the booking is
  -- later removed, and so admins can search by the reference customers quote.
  booking_reference text not null,
  mechanic_id uuid not null references public.profiles (id) on delete restrict,

  -- The tech's share, from splitJobTotalCents(). Integer cents, like every other
  -- money column in this schema.
  amount_cents integer not null check (amount_cents >= 0),

  -- accrued: job captured, tech has earned it, not yet sent
  -- queued:  included in a batch an admin is currently paying out
  -- paid:    money has left the business account
  -- void:    reversed (job refunded before settlement)
  status text not null default 'accrued'
    check (status in ('accrued', 'queued', 'paid', 'void')),

  earned_at timestamptz not null default now(),
  paid_at timestamptz,

  -- How it was actually settled, and the receipt from that system: a Gusto
  -- payment id, an ACH trace number, a Zelle confirmation. This is what makes
  -- the ledger auditable at tax time.
  payout_method text check (payout_method in ('gusto', 'ach', 'zelle', 'check', 'manual')),
  external_reference text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One payout per booking. Capture paths can run more than once (retries, an
-- adjusted capture), and a tech must never accrue the same job twice.
create unique index if not exists tech_payouts_booking_unique
  on public.tech_payouts (booking_id)
  where booking_id is not null;

-- The two queries this table exists to serve: a tech's earnings tab, and the
-- admin's "who do I owe this week" batch.
create index if not exists tech_payouts_mechanic_status_idx
  on public.tech_payouts (mechanic_id, status, earned_at desc);

create index if not exists tech_payouts_status_earned_idx
  on public.tech_payouts (status, earned_at)
  where status in ('accrued', 'queued');

-- A paid row must carry evidence of payment; an unpaid row must not claim any.
alter table public.tech_payouts drop constraint if exists tech_payouts_paid_has_evidence;
alter table public.tech_payouts
  add constraint tech_payouts_paid_has_evidence
  check (
    (status = 'paid' and paid_at is not null and payout_method is not null)
    or (status <> 'paid' and paid_at is null)
  );

alter table public.tech_payouts enable row level security;

-- Techs read their own earnings, and only their own. They can never write:
-- accruals are created by the capture path under the service role, and marking
-- something paid is an admin action.
drop policy if exists tech_payouts_tech_select_own on public.tech_payouts;
create policy tech_payouts_tech_select_own
  on public.tech_payouts
  for select
  to authenticated
  using (mechanic_id = auth.uid());

drop policy if exists tech_payouts_admin_select on public.tech_payouts;
create policy tech_payouts_admin_select
  on public.tech_payouts
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists tech_payouts_admin_write on public.tech_payouts;
create policy tech_payouts_admin_write
  on public.tech_payouts
  for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

comment on table public.tech_payouts is
  'What each tech has earned per completed job, and whether it has been settled. Replaces Stripe Connect transfers: payouts are batched and paid outside the card rail.';
comment on column public.tech_payouts.external_reference is
  'Receipt from the system that actually moved the money (Gusto payment id, ACH trace, Zelle confirmation). Required reading at 1099 time.';
