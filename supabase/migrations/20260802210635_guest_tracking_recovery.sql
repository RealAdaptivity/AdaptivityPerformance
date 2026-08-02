-- Server-only audit/rate-limit ledger for guest tracking-reference recovery.
alter table public.bookings
  add column if not exists customer_phone_digits text
  generated always as (right(regexp_replace(customer_phone, '[^0-9]', '', 'g'), 10)) stored;

create index if not exists bookings_customer_phone_digits_created_idx
  on public.bookings (customer_phone_digits, created_at desc);

create table if not exists public.tracking_recovery_attempts (
  id bigint generated always as identity primary key,
  phone_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists tracking_recovery_attempts_phone_created_idx
  on public.tracking_recovery_attempts (phone_hash, created_at desc);
create index if not exists tracking_recovery_attempts_ip_created_idx
  on public.tracking_recovery_attempts (ip_hash, created_at desc);

alter table public.tracking_recovery_attempts enable row level security;
revoke all on public.tracking_recovery_attempts from anon, authenticated;
revoke all on sequence public.tracking_recovery_attempts_id_seq from anon, authenticated;
