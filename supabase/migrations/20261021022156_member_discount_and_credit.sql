-- Owner's rules (Oct 21):
--  * Members get 10% off labor on every repair. One percentage per visit, so
--    a member never also gets the 5% first responder discount.
--  * Account credit (the $25 referral credit) comes off labor: whatever the
--    customer has, up to the labor left after the percentage.
--
-- Both go into discount_cents, so the total and the tech share are worked out
-- exactly as before ("any discounts go towards labor"). The new columns say
-- what the discount was made of, for the receipt.
--
-- The app sends member: true and credit_cents (what it showed the customer).
-- The amounts are worked out here from the labor lines, the same integer math
-- as computeCloseOut in src/services/closeOut.ts; the credit is checked
-- against the customer's balance and used up in customer_credits.

alter table public.job_payments
  add column if not exists member boolean not null default false,
  add column if not exists credit_cents integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_payments_credit_cents_check') then
    alter table public.job_payments
      add constraint job_payments_credit_cents_check check (credit_cents >= 0 and credit_cents <= discount_cents);
  end if;
end $$;

comment on column public.job_payments.member is
  'Closed as a member: 10% off labor (in discount_cents), no travel or weather fee.';
comment on column public.job_payments.credit_cents is
  'Account credit (referral credit) used on this job, part of discount_cents.';

-- The customer account a booking belongs to: the one it was booked or linked
-- under, else the single customer account with the booking's phone number
-- (how earn_referral_credit finds a guest's account too).
create or replace function public.booking_customer_profile(p_booking_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    b.customer_id,
    (
      select case when count(*) = 1 then (array_agg(p.id))[1] end
      from public.profiles p
      where p.role = 'customer'
        and length(right(regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g'), 10)) = 10
        and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10)
          = right(regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g'), 10)
    )
  )
  from public.bookings b
  where b.id = p_booking_id;
$fn$;

revoke all on function public.booking_customer_profile(uuid) from public, anon, authenticated;

-- What the close-out screen shows: the credit the job's customer has, for the
-- tech on the job or an admin. 0 when the customer has no account.
create or replace function public.job_credit_balance_cents(p_booking_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := public.current_user_role();
  v_mechanic uuid;
  v_customer uuid;
begin
  if v_uid is null then
    raise exception 'Sign in again';
  end if;
  select mechanic_id into v_mechanic from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Job not found';
  end if;
  if not (v_role = 'admin' or (v_role = 'tech' and v_mechanic = v_uid)) then
    raise exception 'Only the tech on this job can see this';
  end if;
  v_customer := public.booking_customer_profile(p_booking_id);
  if v_customer is null then
    return 0;
  end if;
  return greatest(coalesce((select sum(amount_cents) from public.customer_credits where profile_id = v_customer), 0), 0)::integer;
end;
$fn$;

revoke all on function public.job_credit_balance_cents(uuid) from public, anon;
grant execute on function public.job_credit_balance_cents(uuid) to authenticated;

create or replace function public.record_job_payment(p_booking_id uuid, p_payment jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := public.current_user_role();
  v_booking public.bookings%rowtype;
  v_kind text := coalesce(p_payment->>'kind', '');
  v_tax_mode text := coalesce(p_payment->>'tax_mode', 'parts');
  v_parts_by text := coalesce(p_payment->>'parts_by', 'tech');
  v_diag bigint := greatest(coalesce((p_payment->>'diagnostic_cents')::bigint, 0), 0);
  v_travel bigint := greatest(coalesce((p_payment->>'travel_cents')::bigint, 0), 0);
  v_weather bigint := greatest(coalesce((p_payment->>'weather_cents')::bigint, 0), 0);
  v_first_responder boolean := coalesce((p_payment->>'first_responder')::boolean, false);
  v_member boolean := coalesce((p_payment->>'member')::boolean, false);
  v_credit_req bigint := greatest(coalesce((p_payment->>'credit_cents')::bigint, 0), 0);
  v_credit bigint := 0;
  v_customer uuid;
  v_balance bigint;
  v_discount bigint := 0;
  v_parts_pickup boolean := coalesce((p_payment->>'parts_pickup')::boolean, false);
  v_pickup bigint := 0;
  v_sig text := nullif(trim(coalesce(p_payment->>'signature_path', '')), '');
  v_signer text := nullif(left(trim(coalesce(p_payment->>'signer_name', '')), 120), '');
  v_notes text := nullif(left(trim(coalesce(p_payment->>'tech_notes', '')), 2000), '');
  v_method text := coalesce(nullif(p_payment->>'payment_method', ''), 'in_person');
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_title text;
  v_labor bigint;
  v_parts bigint;
  v_labor_total bigint := 0;
  v_parts_total bigint := 0;
  v_before_tax bigint;
  v_tax bigint;
  v_total bigint;
  v_payout bigint;
  -- $100,000: far above any real job, low enough that nothing overflows.
  c_cap constant bigint := 10000000;
begin
  if v_uid is null then
    raise exception 'Sign in again to close this job';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Job not found';
  end if;
  if not (v_role = 'admin' or (v_role = 'tech' and v_booking.mechanic_id = v_uid)) then
    raise exception 'Only the tech on this job can close it';
  end if;
  if v_booking.status in ('COMPLETED', 'CANCELED') then
    raise exception 'This job is already closed';
  end if;
  if v_kind not in ('charge', 'diagnostic_only', 'no_show') then
    raise exception 'Unknown close-out type';
  end if;
  if v_tax_mode not in ('parts', 'total', 'none') then
    raise exception 'Unknown tax setting';
  end if;
  if v_parts_by not in ('tech', 'company') then
    raise exception 'Unknown parts setting';
  end if;
  -- 'card' is only ever set by record-square-payment after Square confirms it.
  if v_method not in ('in_person', 'cash', 'zelle') then
    raise exception 'Unknown payment method';
  end if;

  if v_kind = 'charge' and jsonb_typeof(p_payment->'line_items') = 'array' then
    if jsonb_array_length(p_payment->'line_items') > 20 then
      raise exception 'Too many lines — 20 at most';
    end if;
    for v_item in select value from jsonb_array_elements(p_payment->'line_items') loop
      v_labor := greatest(coalesce((v_item->>'labor_cents')::bigint, 0), 0);
      v_parts := greatest(coalesce((v_item->>'parts_cents')::bigint, 0), 0);
      continue when v_labor = 0 and v_parts = 0;
      v_title := left(regexp_replace(trim(coalesce(v_item->>'title', '')), '\s+', ' ', 'g'), 120);
      if v_title = '' then
        v_title := case
          when v_labor > 0 and v_parts > 0 then 'Labor & parts'
          when v_labor > 0 then 'Labor'
          else 'Parts'
        end;
      end if;
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('title', v_title, 'labor_cents', v_labor, 'parts_cents', v_parts)
      );
      v_labor_total := v_labor_total + v_labor;
      v_parts_total := v_parts_total + v_parts;
    end loop;
  end if;

  if v_kind = 'no_show' then
    v_diag := 0;
    v_travel := 0;
    v_weather := 0;
  end if;

  if greatest(v_diag, v_travel, v_weather, v_labor_total, v_parts_total, v_credit_req) > c_cap then
    raise exception 'An amount is too large — check the numbers';
  end if;

  -- Member discount: 10% of labor on every repair, rounded half up to the
  -- cent (same integer math as computeCloseOut). One percentage per visit,
  -- so a member never also gets the first responder discount.
  if v_kind = 'charge' and v_member then
    v_first_responder := false;
    v_discount := (v_labor_total * 10 + 50) / 100;
  else
    v_member := false;
  end if;

  -- First responder discount: 5% of labor, rounded half up to the cent (same
  -- integer math as computeCloseOut in src/services/closeOut.ts). Repairs only.
  if v_kind = 'charge' and v_first_responder then
    v_discount := (v_labor_total * 5 + 50) / 100;
  else
    v_first_responder := false;
  end if;

  -- Account credit comes off the labor left after the percentage, and only
  -- what the customer actually has. Locked per customer so two close-outs
  -- at once cannot both use the same credit.
  if v_kind = 'charge' and v_credit_req > 0 then
    v_credit := least(v_credit_req, v_labor_total - v_discount);
  end if;
  if v_credit > 0 then
    v_customer := public.booking_customer_profile(p_booking_id);
    if v_customer is null then
      raise exception 'This customer has no account to take credit from — close it without the credit';
    end if;
    perform pg_advisory_xact_lock(hashtext('customer_credits:' || v_customer::text));
    select coalesce(sum(amount_cents), 0) into v_balance from public.customer_credits where profile_id = v_customer;
    if v_credit > v_balance then
      raise exception 'The customer''s credit changed — go back and open the close-out again';
    end if;
    v_discount := v_discount + v_credit;
  else
    v_credit := 0;
  end if;

  -- Parts pickup fee: 10% of the parts, rounded half up to the cent (same
  -- integer math as computeCloseOut). Repairs with parts only.
  if v_kind = 'charge' and v_parts_pickup and v_parts_total > 0 then
    v_pickup := (v_parts_total * 10 + 50) / 100;
  else
    v_parts_pickup := false;
  end if;

  v_before_tax := v_diag + v_travel + v_weather + v_labor_total + v_parts_total + v_pickup - v_discount;
  -- Same integer rounding as taxOn() in src/services/closeOut.ts. The pickup
  -- fee is part of getting the parts to the car, so it is taxed with them.
  v_tax := case v_tax_mode
    when 'parts' then ((v_parts_total + v_pickup) * 825 + 5000) / 10000
    when 'total' then (v_before_tax * 825 + 5000) / 10000
    else 0
  end;
  v_total := v_before_tax + v_tax;
  v_payout := ((v_diag + v_weather + v_labor_total - v_discount) * 70 + 50) / 100
    + v_travel
    + v_pickup
    + case when v_parts_by = 'tech' then v_parts_total else 0 end;

  if v_kind <> 'no_show' and v_total <= 0 then
    raise exception 'Enter what the customer is paying';
  end if;
  if v_role = 'tech' and v_kind <> 'no_show' and (v_sig is null or v_signer is null) then
    raise exception 'Have the customer sign first';
  end if;
  if v_sig is not null and split_part(v_sig, '/', 1) <> p_booking_id::text then
    raise exception 'That signature belongs to a different job';
  end if;

  insert into public.job_payments (
    booking_id, kind, line_items, diagnostic_cents, travel_cents, weather_cents, labor_cents, parts_cents,
    discount_cents, first_responder, member, credit_cents, parts_pickup_cents, parts_pickup,
    tax_mode, tax_cents, total_cents, parts_by, tech_payout_cents, tech_notes,
    signer_name, signature_path, signed_at, recorded_by, payment_method
  ) values (
    p_booking_id, v_kind, v_lines, v_diag, v_travel, v_weather, v_labor_total, v_parts_total,
    v_discount, v_first_responder, v_member, v_credit, v_pickup, v_parts_pickup,
    v_tax_mode, v_tax, v_total, v_parts_by, v_payout, v_notes,
    v_signer, v_sig, case when v_sig is not null then now() end, v_uid,
    case when v_kind = 'no_show' then 'in_person' else v_method end
  );

  if v_credit > 0 then
    insert into public.customer_credits (profile_id, amount_cents, reason, booking_id)
    values (v_customer, -v_credit, 'Used on job ' || v_booking.reference_code, p_booking_id);
  end if;

  update public.bookings
  set status = 'COMPLETED',
      payment_status = case when v_kind = 'no_show' then 'no_show' else 'paid_in_person' end,
      total_estimate = v_total / 100.0,
      captured_amount_cents = v_total,
      no_show_reason = case when v_kind = 'no_show' then coalesce(no_show_reason, 'Customer no-show') else no_show_reason end,
      updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object(
    'total_cents', v_total,
    'tax_cents', v_tax,
    'discount_cents', v_discount,
    'credit_cents', v_credit,
    'member', v_member,
    'parts_pickup_cents', v_pickup,
    'tech_payout_cents', v_payout,
    'line_items', v_lines
  );
end;
$$;

revoke all on function public.record_job_payment(uuid, jsonb) from public, anon;
grant execute on function public.record_job_payment(uuid, jsonb) to authenticated;
