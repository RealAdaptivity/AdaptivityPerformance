alter table public.payments
  add column if not exists is_test boolean not null default false;

comment on column public.payments.is_test is
  'True for startup/test transactions that must remain auditable but stay out of operational views and totals.';

update public.payments
set is_test = true
where booking_reference in (
  'AP-9823',
  'AP-5486',
  'AP-1025',
  'AP-8070',
  'AP-1199',
  'AP-3050',
  'AP-7086',
  'AP-5853'
);

create index if not exists payments_operational_created_idx
  on public.payments (created_at desc)
  where is_test = false;
