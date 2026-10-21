-- The booking form now asks for the vehicle type (owner, Oct 21): Regular,
-- European or Diesel. Any diesel is billed at $200/hr, European at $175/hr,
-- everything else at the shop rate. The tech is shown the higher of what the
-- customer picked and what the vehicle name says (laborRateKindForVehicle in
-- src/services/vehicleLaborRate.ts).

alter table public.bookings add column if not exists vehicle_class text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_vehicle_class_check') then
    alter table public.bookings
      add constraint bookings_vehicle_class_check
      check (vehicle_class is null or vehicle_class in ('regular', 'european', 'diesel'));
  end if;
end $$;

comment on column public.bookings.vehicle_class is
  'Vehicle type the customer picked when booking: regular (shop rate), european ($175/hr) or diesel ($200/hr, any diesel). The tech is shown the higher of this and what the vehicle name says.';
