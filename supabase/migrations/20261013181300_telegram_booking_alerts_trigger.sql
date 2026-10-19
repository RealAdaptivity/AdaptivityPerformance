-- Applied to the project on 2026-10-13; saved here so the repo matches the database.
create trigger bookings_notify_telegram
  after insert on public.bookings
  for each row execute function public.notify_telegram_new_booking();
