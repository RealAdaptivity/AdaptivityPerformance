-- Square tells the website about payments and refunds (square-webhook).
--
-- Refunds made in Square used to be invisible here: a refunded job still read
-- as paid in full. Each refund Square reports is kept in square_refunds, and
-- the completed ones are summed onto the job's job_payments row. Webhook
-- deliveries are logged by event id so a retried delivery is applied once.
-- Only the edge function writes; admins can read.

alter table public.job_payments
  add column if not exists refunded_cents bigint not null default 0,
  add column if not exists refunded_at timestamptz;

alter table public.job_payments
  add constraint job_payments_refunded_cents_check check (refunded_cents >= 0 and refunded_cents <= total_cents);

comment on column public.job_payments.refunded_cents is
  'Money given back through Square for this job, kept in step with square_refunds by the square-webhook edge function.';
comment on column public.job_payments.refunded_at is
  'When the latest Square refund on this job completed.';

create table if not exists public.square_refunds (
  id text primary key,
  payment_id text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null,
  reason text,
  square_created_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.square_refunds is
  'Every refund Square reports (refund.created / refund.updated). Completed ones are summed into job_payments.refunded_cents. Written only by the square-webhook edge function.';

create index if not exists square_refunds_payment_idx on public.square_refunds (payment_id);

create table if not exists public.square_webhook_events (
  event_id text primary key,
  type text not null,
  object_id text,
  outcome text,
  received_at timestamptz not null default now()
);

comment on table public.square_webhook_events is
  'Square webhook deliveries already handled, so a retried delivery is not applied twice, with what was done about each.';

alter table public.square_refunds enable row level security;
alter table public.square_webhook_events enable row level security;

create policy square_refunds_admin_read on public.square_refunds
  for select to authenticated
  using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy square_webhook_events_admin_read on public.square_webhook_events
  for select to authenticated
  using ((select public.current_user_role()) = 'admin'::public.user_role);

grant select on public.square_refunds, public.square_webhook_events to authenticated;
