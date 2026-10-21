-- Referral credit, second pass. When the job is closed out the friend is
-- found from, in order: the account that entered the code, the account the
-- booking was later linked to, or the one customer account with the
-- booking's phone number. If none is found, only the person who shared the
-- code gets credit. (Guest bookings get their redemption row in the next
-- migration.)
--
-- No credit, and the redemption is voided, when:
--  * the booking is the referrer's own (same account or same phone number);
--  * it is not the friend's first finished job (an earlier non-no-show
--    close-out on the same account or phone number);
--  * the friend already earned a referral before.

create or replace function public.earn_referral_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r record;
  bk record;
  bk_phone text;
  ref_phone text;
  friend uuid;
begin
  if new.kind = 'no_show' then
    return new;
  end if;

  select b.id, b.customer_id, b.customer_phone into bk from public.bookings b where b.id = new.booking_id;
  bk_phone := nullif(right(regexp_replace(coalesce(bk.customer_phone, ''), '\D', '', 'g'), 10), '');
  if bk_phone is not null and length(bk_phone) < 10 then
    bk_phone := null;
  end if;

  for r in
    select rr.id, rr.referred_profile_id, rr.referrer_credit_cents, rr.referred_credit_cents, rc.profile_id as referrer_id
    from public.referral_redemptions rr
    join public.referral_codes rc on rc.id = rr.referral_code_id
    where rr.booking_id = new.booking_id and rr.status = 'pending'
    for update of rr
  loop
    friend := coalesce(r.referred_profile_id, bk.customer_id);
    if friend is null and bk_phone is not null then
      select case when count(*) = 1 then (array_agg(p.id))[1] end into friend
      from public.profiles p
      where p.role = 'customer'
        and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = bk_phone;
    end if;

    select nullif(right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10), '') into ref_phone
    from public.profiles p where p.id = r.referrer_id;

    if friend = r.referrer_id
      or (bk_phone is not null and bk_phone = ref_phone)
      or exists (
        select 1
        from public.job_payments jp
        join public.bookings b2 on b2.id = jp.booking_id
        where jp.booking_id <> new.booking_id
          and jp.kind <> 'no_show'
          and (
            (friend is not null and b2.customer_id = friend)
            or (bk_phone is not null and right(regexp_replace(coalesce(b2.customer_phone, ''), '\D', '', 'g'), 10) = bk_phone)
          )
      )
      or (friend is not null and exists (
        select 1 from public.referral_redemptions e
        where e.referred_profile_id = friend and e.status in ('earned', 'paid') and e.id <> r.id
      ))
    then
      update public.referral_redemptions set status = 'void' where id = r.id;
      continue;
    end if;

    update public.referral_redemptions
      set status = 'earned', earned_at = now(), referred_profile_id = coalesce(referred_profile_id, friend)
      where id = r.id;

    if r.referrer_id is not null and coalesce(r.referrer_credit_cents, 0) > 0 then
      insert into public.customer_credits (profile_id, amount_cents, reason, booking_id, referral_redemption_id)
      values (r.referrer_id, r.referrer_credit_cents, 'Referral: a friend you referred finished their first job', new.booking_id, r.id);
    end if;
    if friend is not null and coalesce(r.referred_credit_cents, 0) > 0 then
      insert into public.customer_credits (profile_id, amount_cents, reason, booking_id, referral_redemption_id)
      values (friend, r.referred_credit_cents, 'Referral: your first job booked with a friend''s code', new.booking_id, r.id);
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
