-- PayPal columns on payments/bookings.
--
-- Purely additive. Every stripe_* column stays: those rows are the audit trail
-- for jobs already paid through Stripe, and a refund against a historical charge
-- has to know which rail took the money. The `processor` discriminator is what
-- tells the two eras apart.
--
-- PayPal needs more identifier columns than Stripe did, because one payment
-- produces three separate ids rather than two. An order is not a charge:
-- authorizing yields an authorization id, capturing that yields a capture id,
-- and a refund references the capture. All three are kept — a refund cannot be
-- issued without the capture id, and a void cannot be issued without the
-- authorization id.

alter table public.payments
  -- 'stripe' | 'paypal'. Existing rows are all Stripe by definition.
  add column if not exists processor text not null default 'stripe',
  -- The order, created when checkout opens.
  add column if not exists paypal_order_id text,
  -- The hold. Voidable until captured; funds guaranteed ~3 days.
  add column if not exists paypal_authorization_id text,
  -- Capture of that authorization. Refunds reference this, not the order.
  add column if not exists paypal_capture_id text,
  -- Separate capture covering a repair total above the diagnostic hold.
  add column if not exists paypal_remainder_capture_id text,
  -- Vaulted card, used to charge that remainder off-session.
  add column if not exists paypal_vault_id text,
  add column if not exists paypal_refund_id text;

alter table public.bookings
  add column if not exists processor text not null default 'stripe',
  add column if not exists paypal_order_id text,
  add column if not exists paypal_authorization_id text,
  add column if not exists paypal_vault_id text,
  -- When the authorization stops being guaranteed. Distinct from
  -- hold_expires_at, which is our own booking-side deadline.
  add column if not exists paypal_authorization_expires_at timestamptz;

-- Guard against a typo'd discriminator silently routing a refund to a dead
-- processor. NOT VALID so the statement never rewrites the table; validated
-- separately once existing rows are confirmed to conform.
alter table public.payments drop constraint if exists payments_processor_valid;
alter table public.payments
  add constraint payments_processor_valid
  check (processor in ('stripe', 'paypal')) not valid;
alter table public.payments validate constraint payments_processor_valid;

alter table public.bookings drop constraint if exists bookings_processor_valid;
alter table public.bookings
  add constraint bookings_processor_valid
  check (processor in ('stripe', 'paypal')) not valid;
alter table public.bookings validate constraint bookings_processor_valid;

-- Webhooks and the confirm path both resolve a payment row from a PayPal id.
create index if not exists payments_paypal_order_id_idx
  on public.payments (paypal_order_id)
  where paypal_order_id is not null;

create index if not exists payments_paypal_authorization_id_idx
  on public.payments (paypal_authorization_id)
  where paypal_authorization_id is not null;

create index if not exists payments_paypal_capture_id_idx
  on public.payments (paypal_capture_id)
  where paypal_capture_id is not null;

create index if not exists bookings_paypal_order_id_idx
  on public.bookings (paypal_order_id)
  where paypal_order_id is not null;

-- create-payment-intent upserts the payments row keyed on the order id, because
-- no capture exists until the buyer approves. Partial, so the many historical
-- Stripe rows with a NULL order id do not collide with each other.
create unique index if not exists payments_paypal_order_id_unique
  on public.payments (paypal_order_id)
  where paypal_order_id is not null;

comment on column public.payments.processor is
  'Which rail took this money: stripe (pre-2026-08 cutover) or paypal. Refunds and voids must be issued against the same rail that captured.';
comment on column public.payments.paypal_capture_id is
  'PayPal capture id. Refunds reference the capture, never the order or authorization.';
comment on column public.bookings.paypal_authorization_expires_at is
  'When PayPal stops guaranteeing the authorized funds (~3 days). Past this the authorization must be reauthorized before it can be captured.';
