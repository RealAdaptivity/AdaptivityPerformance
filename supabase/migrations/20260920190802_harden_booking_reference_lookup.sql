-- Two defects in one generator.
--
-- 1. Reference codes were 'AP-' plus a random 4-digit number: exactly 9,000
--    possible values. get_booking_by_reference is callable by `anon`, so the
--    whole keyspace could be swept in seconds, returning every customer's name,
--    phone number, home address, vehicle and GPS coordinates. Demonstrated:
--    an anonymous sweep of AP-1000..AP-9999 returned every booking on file.
--
-- 2. reference_code carries a unique index and the generator had no retry, so
--    once collisions start (~50% chance by ~112 bookings, birthday bound) an
--    insert simply fails and the customer's booking is lost.
--
-- Both are the same fix: far more entropy, and retry if the draw collides.
create or replace function public.generate_booking_reference()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  -- Crockford-style alphabet: no I, L, O or U, so a code read down the phone
  -- cannot be misheard or confused with 1/0.
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
  v_attempt int := 0;
begin
  if new.reference_code is not null and new.reference_code <> '' then
    return new;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := 'AP-';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.bookings where reference_code = v_code);

    -- 32^8 is about 1.1 trillion codes; needing more than a few draws means
    -- something is badly wrong, so fail loudly rather than spin.
    if v_attempt >= 10 then
      raise exception 'Could not allocate a unique booking reference after % attempts', v_attempt;
    end if;
  end loop;

  new.reference_code := v_code;
  return new;
end;
$function$;

-- Looking a booking up by reference alone is no longer enough for an anonymous
-- caller: they must also supply the last four digits of the phone number on the
-- booking. Staff, and a signed-in customer who owns the booking, still look up
-- by reference alone.
create or replace function public.get_booking_by_reference(ref text, phone_last4 text default null)
 returns table(id uuid, reference_code text, customer_name text, customer_phone text, customer_address text, zip_code text, vehicle_description text, services jsonb, total_estimate numeric, location_type location_type, status job_status, distance_miles numeric, eta_minutes integer, mechanic_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, payment_status text, hold_amount_cents integer, captured_amount_cents integer, dispatch_lat numeric, dispatch_lng numeric, quote_status text, recommended_total_cents integer, active_quote_id uuid, quote_line_items jsonb, quote_total_cents integer, quote_diagnostic_fee_cents integer, quote_repairs_cents integer, quote_tech_notes text, preferred_date date, preferred_time_window text, customer_notes text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_row public.bookings%rowtype;
  v_is_staff boolean := false;
begin
  select * into v_row from public.bookings b where b.reference_code = trim(ref) limit 1;
  if not found then
    return;  -- same empty result as a wrong second factor: do not confirm the code exists
  end if;

  if v_user is not null then
    v_is_staff := public.current_user_role() in ('admin'::public.user_role, 'tech'::public.user_role);
  end if;

  if not (
    v_is_staff
    or (v_user is not null and v_row.customer_id = v_user)
    or (
      phone_last4 is not null
      and length(regexp_replace(coalesce(v_row.customer_phone, ''), '\D', '', 'g')) >= 4
      and right(regexp_replace(v_row.customer_phone, '\D', '', 'g'), 4) = right(regexp_replace(phone_last4, '\D', '', 'g'), 4)
    )
  ) then
    return;  -- no rows; the caller learns nothing about whether the code is real
  end if;

  return query
    select
      b.id, b.reference_code, b.customer_name, b.customer_phone, b.customer_address, b.zip_code,
      b.vehicle_description, b.services, b.total_estimate, b.location_type, b.status,
      b.distance_miles, b.eta_minutes, b.mechanic_id, b.created_at, b.updated_at,
      b.payment_status, b.hold_amount_cents, b.captured_amount_cents, b.dispatch_lat, b.dispatch_lng,
      b.quote_status, b.recommended_total_cents, b.active_quote_id,
      q.line_items, q.total_cents, q.diagnostic_fee_cents, q.repairs_cents, q.tech_notes,
      b.preferred_date, b.preferred_time_window, b.customer_notes
    from public.bookings b
    left join public.booking_quotes q on q.id = b.active_quote_id
    where b.id = v_row.id;
end;
$function$;
