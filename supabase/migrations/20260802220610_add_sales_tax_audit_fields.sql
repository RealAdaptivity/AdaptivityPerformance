alter table public.booking_quotes
  add column if not exists sales_tax_cents integer not null default 0,
  add column if not exists stripe_tax_calculation_id text,
  add column if not exists stripe_tax_transaction_id text;

alter table public.payments
  add column if not exists sales_tax_cents integer not null default 0,
  add column if not exists stripe_tax_calculation_id text,
  add column if not exists stripe_tax_transaction_id text;

comment on column public.booking_quotes.sales_tax_cents is
  'Sales tax collected from the customer; excluded from technician revenue share.';
comment on column public.payments.sales_tax_cents is
  'Sales tax collected from the customer; retained for tax remittance, not platform revenue.';

alter table public.booking_quotes drop constraint if exists booking_quotes_sales_tax_nonnegative;
alter table public.booking_quotes
  add constraint booking_quotes_sales_tax_nonnegative check (sales_tax_cents >= 0) not valid;
alter table public.booking_quotes validate constraint booking_quotes_sales_tax_nonnegative;

alter table public.payments drop constraint if exists payments_sales_tax_nonnegative;
alter table public.payments
  add constraint payments_sales_tax_nonnegative check (sales_tax_cents >= 0) not valid;
alter table public.payments validate constraint payments_sales_tax_nonnegative;
