-- Idempotency ledger for incoming Stripe webhook events. Stripe may deliver the
-- same event more than once; recording each event id lets the webhook claim an
-- event before processing and skip any subsequent duplicate delivery — which in
-- particular prevents a repeated payment_intent.succeeded from triggering a
-- second technician payout.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text,
  received_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_received_at_idx
  on public.stripe_webhook_events (received_at);

-- Only the service role (the edge function) touches this table. Enable RLS with
-- no policies so anon/authenticated clients cannot read or write it.
alter table public.stripe_webhook_events enable row level security;
