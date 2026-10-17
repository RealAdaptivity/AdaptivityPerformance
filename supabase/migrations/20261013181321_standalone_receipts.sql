-- Receipts for quotes paid outside a job closed in the tech app (cash, card,
-- Zelle or check), made in the admin Receipts tab. Numbered from the same
-- R- sequence as job receipts. Admin only.
--
-- Applied to the database before it was committed; the table definition is
-- written out from the live schema.
create sequence if not exists public.receipt_number_seq start with 1001;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique default ('R-' || nextval('public.receipt_number_seq')::text),
  quote_id uuid references public.quotes(id) on delete set null,
  customer_name text not null check (length(trim(customer_name)) between 1 and 200),
  customer_phone text,
  customer_email text,
  customer_address text,
  vehicle text,
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  line_items jsonb not null default '[]'::jsonb,
  labor_cents integer not null default 0 check (labor_cents >= 0),
  parts_cents integer not null default 0 check (parts_cents >= 0),
  tax_mode text not null default 'parts' check (tax_mode in ('parts', 'total', 'none')),
  tax_rate_basis_points integer not null default 825,
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  labor_rate_cents integer not null default 15000,
  payment_method text not null check (payment_method in ('cash', 'card', 'zelle', 'check', 'other')),
  payment_reference text,
  paid_on date not null default ((now() at time zone 'America/Chicago')::date),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    payment_reference is null
    or (
      length(trim(payment_reference)) between 1 and 80
      and (payment_method <> 'card' or payment_reference ~ '^[0-9]{4}$')
    )
  ),
  constraint receipts_total_adds_up check (total_cents = labor_cents + parts_cents + tax_cents)
);

create index if not exists receipts_created_at_idx on public.receipts (created_at desc);
create index if not exists receipts_quote_id_idx on public.receipts (quote_id);
create index if not exists receipts_created_by_idx on public.receipts (created_by);

create trigger receipts_set_updated_at before update on public.receipts
  for each row execute function public.set_updated_at();

alter table public.receipts enable row level security;
create policy receipts_admin_all on public.receipts for all to authenticated
  using ((select public.current_user_role()) = 'admin'::public.user_role)
  with check ((select public.current_user_role()) = 'admin'::public.user_role);
