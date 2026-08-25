-- Helcim migration, step 1: give payments/bookings somewhere to record Helcim
-- transactions alongside the existing Stripe ones.
--
-- Purely additive. Every stripe_* / payment_intent_id column stays exactly as it
-- is: those rows are the audit trail for jobs already paid through Stripe (and
-- for AP-4354's transfer in particular), and refunds against historical Stripe
-- charges must keep working after the cutover. A `processor` discriminator tells
-- the two eras apart, so code can route a refund to the rail that took the money.

alter table public.payments
  -- 'stripe' | 'helcim'. Existing rows are all Stripe by definition.
  add column if not exists processor text not null default 'stripe',
  -- The preauth (card hold) transaction. Analogue of payment_intent_id.
  add column if not exists helcim_transaction_id text,
  -- Capture of that preauth. Helcim issues a new id rather than mutating the
  -- preauth, so both are kept for reconciliation.
  add column if not exists helcim_capture_transaction_id text,
  -- Separate purchase covering a repair total above the diagnostic hold.
  add column if not exists helcim_remainder_transaction_id text,
  -- Vaulted card from HelcimPay.js, used to charge that remainder off-session.
  add column if not exists helcim_card_token text,
  add column if not exists helcim_customer_code text,
  -- HelcimPay.js checkout session; short-lived, retained for support lookups.
  add column if not exists helcim_checkout_token text,
  add column if not exists helcim_refund_transaction_id text;

alter table public.bookings
  add column if not exists processor text not null default 'stripe',
  add column if not exists helcim_transaction_id text,
  add column if not exists helcim_card_token text,
  add column if not exists helcim_checkout_token text;

-- Guard against a typo'd discriminator silently routing a refund to the wrong
-- processor. NOT VALID so the statement never rewrites the existing table;
-- validated separately below once existing rows are confirmed to conform.
alter table public.payments drop constraint if exists payments_processor_valid;
alter table public.payments
  add constraint payments_processor_valid
  check (processor in ('stripe', 'helcim')) not valid;
alter table public.payments validate constraint payments_processor_valid;

alter table public.bookings drop constraint if exists bookings_processor_valid;
alter table public.bookings
  add constraint bookings_processor_valid
  check (processor in ('stripe', 'helcim')) not valid;
alter table public.bookings validate constraint bookings_processor_valid;

-- Lookups by Helcim transaction id happen on every webhook delivery and on the
-- capture path, which resolves a payment row from the preauth id.
create index if not exists payments_helcim_transaction_id_idx
  on public.payments (helcim_transaction_id)
  where helcim_transaction_id is not null;

create index if not exists payments_helcim_capture_transaction_id_idx
  on public.payments (helcim_capture_transaction_id)
  where helcim_capture_transaction_id is not null;

create index if not exists bookings_helcim_transaction_id_idx
  on public.bookings (helcim_transaction_id)
  where helcim_transaction_id is not null;

comment on column public.payments.processor is
  'Which rail took this money: stripe (pre-2026-08 cutover) or helcim. Refunds and reversals must be issued against the same rail that captured.';
comment on column public.payments.helcim_transaction_id is
  'Helcim preauth transaction id — the card hold placed at booking.';
comment on column public.payments.helcim_card_token is
  'Vaulted Helcim card token from HelcimPay.js, used to charge a repair remainder above the hold without re-collecting the card.';
