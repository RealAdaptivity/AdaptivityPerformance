-- Phone bookings: an admin books a visit for a caller from the dispatch board.
--
-- They go through create-booking-request like a website booking, with
-- phoneBooking: true. The edge function only accepts that from an admin, and
-- then leaves customer_id empty (the booking belongs to the caller, not the
-- admin who typed it) and records who took the call here. The customer can
-- still claim it later by signing up with the same phone or email, as with
-- any guest booking.

alter table public.bookings
  add column if not exists booking_source text not null default 'website',
  add column if not exists booked_by uuid references public.profiles(id) on delete set null;

alter table public.bookings
  drop constraint if exists bookings_booking_source_check;
alter table public.bookings
  add constraint bookings_booking_source_check check (booking_source in ('website', 'phone'));

comment on column public.bookings.booking_source is
  'website: the customer booked online. phone: an admin booked it for a caller from the dispatch board.';
comment on column public.bookings.booked_by is
  'The admin who took a phone booking. Empty for website bookings.';

create index if not exists bookings_booked_by_idx on public.bookings (booked_by) where booked_by is not null;
