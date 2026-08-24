-- Customer-present payment links. When a technician finalizes a job total they can
-- send the customer a link to pay themselves (card or Buy-Now-Pay-Later), instead
-- of the tech charging the card on file off-session (BNPL cannot run off-session).
-- The finalized total is stored here so the public checkout page cannot tamper with
-- the amount — the server always charges payment_link_total_cents, never a
-- client-supplied figure.
alter table public.bookings
  add column if not exists payment_link_status text,
  add column if not exists payment_link_total_cents integer,
  add column if not exists payment_link_tax_cents integer,
  add column if not exists payment_link_parts_cents integer,
  add column if not exists payment_link_parts_by text,
  add column if not exists payment_link_line_items jsonb,
  add column if not exists payment_link_created_at timestamptz;

-- Look up an active link by reference from the public checkout page.
create index if not exists bookings_payment_link_status_idx
  on public.bookings (payment_link_status)
  where payment_link_status is not null;
