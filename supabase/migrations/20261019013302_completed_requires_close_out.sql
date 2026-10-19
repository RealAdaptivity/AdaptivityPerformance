-- A job becomes Completed only by closing it out (record_job_payment), which
-- records what the customer paid, the receipt and the tech's pay. Dispatch
-- could set Completed by hand, and three jobs ended up Completed with none of
-- those: no receipt, nothing in the P&L, no tech pay.
--
-- Closing out also schedules the review request. It is due two hours later
-- and listed on the Growth tab; nothing set it before, so no customer was
-- ever asked. A no-show gets no request.

create or replace function public.bookings_complete_via_close_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    if not exists (select 1 from public.job_payments jp where jp.booking_id = new.id) then
      raise exception 'Close out this job to mark it Completed. Closing out records the payment, the receipt and the tech''s pay.'
        using errcode = 'P0001';
    end if;
    if new.review_ask_due_at is null and coalesce(new.payment_status, '') <> 'no_show' then
      new.review_ask_due_at := now() + interval '2 hours';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.bookings_complete_via_close_out() is
  'Blocks Completed without a job_payments row, and schedules the review request when a paid job closes.';

revoke all on function public.bookings_complete_via_close_out() from public, anon, authenticated;

create or replace trigger bookings_complete_via_close_out
  before update of status on public.bookings
  for each row execute function public.bookings_complete_via_close_out();
