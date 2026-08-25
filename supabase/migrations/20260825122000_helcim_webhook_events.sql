-- Idempotency ledger for incoming Helcim webhooks.
--
-- Same purpose as stripe_webhook_events, which stays in place for the historical
-- record: a processor may deliver the same event more than once, so the receiver
-- claims an event id before doing any work and skips duplicates. Here that
-- matters specifically because a repeated transaction event must not accrue a
-- second payout for the same job.
create table if not exists public.helcim_webhook_events (
  event_id text primary key,
  event_type text,
  received_at timestamptz not null default now()
);

create index if not exists helcim_webhook_events_received_at_idx
  on public.helcim_webhook_events (received_at);

-- Only the service role (the edge function) touches this table. RLS on with no
-- policies so anon/authenticated clients can neither read nor write it.
alter table public.helcim_webhook_events enable row level security;
