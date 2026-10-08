-- Parts pickup fee: 10% of the parts on a repair, for the trip to get them,
-- whether the tech or the company bought them (owner's rule). Never on
-- customer-supplied parts, which are not on the ticket.
--
-- The app sends only parts_pickup: true. The amount is worked out here from
-- the parts lines, the same sum as computeCloseOut in src/services/closeOut.ts,
-- so a client cannot send its own fee. It is taxed with the parts (getting
-- the parts to the car is part of selling them) and, like the travel fee,
-- goes to the tech in full.
--
-- Additive: a request without parts_pickup closes exactly as before.

alter table public.job_payments
  add column if not exists parts_pickup_cents integer not null default 0,
  add column if not exists parts_pickup boolean not null default false;

alter table public.job_payments
  drop constraint if exists job_payments_parts_pickup_cents_check;
alter table public.job_payments
  add constraint job_payments_parts_pickup_cents_check check (parts_pickup_cents >= 0 and parts_pickup_cents <= parts_cents);

alter table public.job_payments
  drop constraint if exists job_payments_total_adds_up;
alter table public.job_payments
  add constraint job_payments_total_adds_up
  check (total_cents = diagnostic_cents + travel_cents + weather_cents + labor_cents + parts_cents + parts_pickup_cents - discount_cents + tax_cents);

comment on column public.job_payments.parts_pickup_cents is
  'Parts pickup fee (10% of parts) when parts_pickup is true. Goes to the tech in full.';

alter table public.quotes
  add column if not exists parts_pickup_cents integer not null default 0;

comment on column public.quotes.parts_pickup_cents is
  'Parts pickup fee (10% of parts) included in the quoted total, so the invoice does not exceed the quote.';

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

  if greatest(v_diag, v_travel, v_weather, v_labor_total, v_parts_total) > c_cap then
    raise exception 'An amount is too large — check the numbers';
  end if;

  -- First responder discount: 5% of labor, rounded half up to the cent (same
  -- integer math as computeCloseOut in src/services/closeOut.ts). Repairs only.
  if v_kind = 'charge' and v_first_responder then
    v_discount := (v_labor_total * 5 + 50) / 100;
  else
    v_first_responder := false;
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
    discount_cents, first_responder, parts_pickup_cents, parts_pickup,
    tax_mode, tax_cents, total_cents, parts_by, tech_payout_cents, tech_notes,
    signer_name, signature_path, signed_at, recorded_by, payment_method
  ) values (
    p_booking_id, v_kind, v_lines, v_diag, v_travel, v_weather, v_labor_total, v_parts_total,
    v_discount, v_first_responder, v_pickup, v_parts_pickup,
    v_tax_mode, v_tax, v_total, v_parts_by, v_payout, v_notes,
    v_signer, v_sig, case when v_sig is not null then now() end, v_uid,
    case when v_kind = 'no_show' then 'in_person' else v_method end
  );

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
    'parts_pickup_cents', v_pickup,
    'tech_payout_cents', v_payout,
    'line_items', v_lines
  );
end;
$$;

revoke all on function public.record_job_payment(uuid, jsonb) from public, anon;
grant execute on function public.record_job_payment(uuid, jsonb) to authenticated;
