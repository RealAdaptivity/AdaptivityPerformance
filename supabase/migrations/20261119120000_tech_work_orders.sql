-- Tech work orders: what the vehicle needs, written up by the tech on the
-- phone call, so dispatch sees the parts, labor and the tech's payout before
-- the visit. Also the license plate, which any booking can now carry.
--
-- create-booking-request fills these for a tech booking. The totals are
-- worked out there with computeCloseOut (supabase/functions/_shared), the
-- same sum the tech charges at close-out: diagnostic, travel on a mobile
-- visit, labor, parts, the 10% parts pickup fee when on, tax on parts.
-- They are an estimate; the job's real money is still job_payments.

alter table public.bookings
  add column if not exists license_plate text,
  add column if not exists work_order jsonb,
  add column if not exists work_order_total_cents integer,
  add column if not exists work_order_tech_payout_cents integer;

alter table public.bookings
  drop constraint if exists bookings_license_plate_check;
alter table public.bookings
  add constraint bookings_license_plate_check check (license_plate is null or license_plate ~ '^[A-Z0-9 -]{1,10}$');

alter table public.bookings
  drop constraint if exists bookings_work_order_totals_check;
alter table public.bookings
  add constraint bookings_work_order_totals_check
  check (coalesce(work_order_total_cents, 0) >= 0 and coalesce(work_order_tech_payout_cents, 0) >= 0);

comment on column public.bookings.license_plate is
  'The vehicle''s license plate, upper case, as the tech or customer gave it.';
comment on column public.bookings.work_order is
  'The tech''s work order from the phone call: {"lines":[{"title","partsCents","laborCents"}],"partsPickup":bool}. Part prices include the tech''s upcharge.';
comment on column public.bookings.work_order_total_cents is
  'Estimated total for the work order, with diagnostic, travel, pickup fee and tax, as computeCloseOut sums it.';
comment on column public.bookings.work_order_tech_payout_cents is
  'Estimated payout to the tech for the work order, as computeCloseOut sums it (parts bought by the tech).';
