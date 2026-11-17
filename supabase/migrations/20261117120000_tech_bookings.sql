-- Tech bookings: a technician books a visit for a customer from the tech portal.
--
-- They go through create-booking-request with techBooking: true. Like a phone
-- booking, customer_id stays empty (the customer can claim it later) and the
-- tech is recorded as booked_by. Unlike a phone booking, the visit is already
-- the tech's: mechanic_id is set and status stays UNASSIGNED until they tap
-- Start, so it sits on their Booked list and never on the open board.

alter table public.bookings
  drop constraint if exists bookings_booking_source_check;
alter table public.bookings
  add constraint bookings_booking_source_check check (booking_source in ('website', 'phone', 'tech'));

comment on column public.bookings.booking_source is
  'website: the customer booked online. phone: an admin booked it for a caller from the dispatch board. tech: a technician booked it for a customer from the tech portal.';
comment on column public.bookings.booked_by is
  'The admin who took a phone booking, or the technician who made a tech booking. Empty for website bookings.';
