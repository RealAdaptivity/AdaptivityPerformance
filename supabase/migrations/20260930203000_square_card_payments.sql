-- Card payments taken in the tech app with Square Tap to Pay.
--
-- A job paid by card still closes through record_job_payment, exactly like a
-- cash or Square-app payment: same lines, same sums, same customer signature,
-- and bookings.payment_status stays 'paid_in_person' (the card was tapped at
-- the vehicle). What this adds is the record of *how* it was paid.
--
-- Only the record-square-payment edge function writes these columns, and only
-- after it has fetched the payment from Square and checked it is completed,
-- for this job's reference, at our location, for exactly the recorded total.
-- The unique index stops one Square payment being used to close two jobs.

alter table public.job_payments
  add column if not exists payment_method text not null default 'in_person',
  add column if not exists square_payment_id text,
  add column if not exists square_location_id text,
  add column if not exists card_brand text,
  add column if not exists card_last4 text;

alter table public.job_payments
  drop constraint if exists job_payments_payment_method_check;
alter table public.job_payments
  add constraint job_payments_payment_method_check
  check (payment_method in ('in_person', 'card'));

alter table public.job_payments
  drop constraint if exists job_payments_card_has_square_id;
alter table public.job_payments
  add constraint job_payments_card_has_square_id
  check (payment_method <> 'card' or square_payment_id is not null);

create unique index if not exists job_payments_square_payment_id_key
  on public.job_payments (square_payment_id)
  where square_payment_id is not null;

comment on column public.job_payments.payment_method is
  'in_person: cash or the Square app, confirmed by the tech. card: Square Tap to Pay in the tech app, verified with Square by record-square-payment.';
comment on column public.job_payments.square_payment_id is
  'Square payment id for a card payment. Unique: one payment closes one job.';
