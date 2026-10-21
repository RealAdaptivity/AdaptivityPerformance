-- The site promises "$25 / $25" for referrals: when a friend books with your
-- code and their first job is done, you both get $25 credit. Bookings with a
-- code have always created a pending referral_redemptions row, but nothing
-- ever marked one earned or put the credit on anyone's account.
--
-- When a job is closed out (a job_payments row is written) and it was not a
-- no-show, its pending redemption is earned: the referrer and the friend each
-- get their credit in customer_credits, which customer_credit_balance_cents
-- already sums for the portal. A friend earns this once, on their first job;
-- a later booking with a code is voided rather than paid twice.

create or replace function public.earn_referral_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r record;
begin
  if new.kind = 'no_show' then
    return new;
  end if;

  for r in
    select rr.id, rr.referred_profile_id, rr.referrer_credit_cents, rr.referred_credit_cents, rc.profile_id as referrer_id
    from public.referral_redemptions rr
    join public.referral_codes rc on rc.id = rr.referral_code_id
    where rr.booking_id = new.booking_id and rr.status = 'pending'
    for update of rr
  loop
    if r.referred_profile_id is not null and exists (
      select 1 from public.referral_redemptions e
      where e.referred_profile_id = r.referred_profile_id and e.status in ('earned', 'paid') and e.id <> r.id
    ) then
      update public.referral_redemptions set status = 'void' where id = r.id;
      continue;
    end if;

    update public.referral_redemptions set status = 'earned', earned_at = now() where id = r.id;

    if r.referrer_id is not null and coalesce(r.referrer_credit_cents, 0) > 0 then
      insert into public.customer_credits (profile_id, amount_cents, reason, booking_id, referral_redemption_id)
      values (r.referrer_id, r.referrer_credit_cents, 'Referral: a friend you referred finished their first job', new.booking_id, r.id);
    end if;
    if r.referred_profile_id is not null and coalesce(r.referred_credit_cents, 0) > 0 then
      insert into public.customer_credits (profile_id, amount_cents, reason, booking_id, referral_redemption_id)
      values (r.referred_profile_id, r.referred_credit_cents, 'Referral: your first job booked with a friend''s code', new.booking_id, r.id);
    end if;
  end loop;
  return new;
exception when others then
  -- Never block a close-out over a referral; the redemption stays pending.
  raise warning 'earn_referral_credit failed: %', sqlerrm;
  return new;
end;
$fn$;

revoke all on function public.earn_referral_credit() from public, anon, authenticated;

create or replace trigger job_payments_earn_referral
  after insert on public.job_payments
  for each row execute function public.earn_referral_credit();
