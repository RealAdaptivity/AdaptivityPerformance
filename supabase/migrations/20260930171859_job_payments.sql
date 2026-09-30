-- What was collected on a closed job, line by line, with the customer's
-- signature.
--
-- Until now closing a job wrote only bookings.total_estimate, and wrote it
-- wrong: the diagnostic was left out of the saved total and sales tax was
-- added twice (once as a line, once as tax). Nothing kept the lines, so a
-- receipt sent later could not be itemized. No job had been completed yet
-- when this landed, so no stored total was affected.
--
-- Closing goes through record_job_payment only: it checks the caller is the
-- tech on the job (or an admin), recomputes every total from the lines, and
-- writes this row and the booking together. The same sums live in
-- src/services/closeOut.ts; tests/closeOut.test.ts checks both use the same
-- rates.

create table if not exists public.job_payments (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('charge', 'diagnostic_only', 'no_show')),
  -- [{ "title": text, "labor_cents": int, "parts_cents": int }]
  line_items jsonb not null default '[]'::jsonb,
  diagnostic_cents integer not null default 0 check (diagnostic_cents >= 0),
  travel_cents integer not null default 0 check (travel_cents >= 0),
  labor_cents integer not null default 0 check (labor_cents >= 0),
  parts_cents integer not null default 0 check (parts_cents >= 0),
  tax_mode text not null default 'parts' check (tax_mode in ('parts', 'total', 'none')),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null,
  parts_by text not null default 'tech' check (parts_by in ('tech', 'company')),
  tech_payout_cents integer not null default 0 check (tech_payout_cents >= 0),
  tech_notes text,
  signer_name text,
  signature_path text,
  signed_at timestamptz,
  recorded_by uuid references public.profiles(id) on delete set null,
  receipt_texted_at timestamptz,
  receipt_emailed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint job_payments_total_adds_up
    check (total_cents = diagnostic_cents + travel_cents + labor_cents + parts_cents + tax_cents)
);

comment on table public.job_payments is
  'One row per closed job: what the customer paid in person, itemized, and their signature. Written only by record_job_payment.';

alter table public.job_payments enable row level security;

-- Read: admins, the tech on the job, and the customer it belongs to.
drop policy if exists "job payments read" on public.job_payments;
create policy "job payments read"
  on public.job_payments for select
  to authenticated
  using (
    (select public.current_user_role()) = 'admin'
    or exists (
      select 1 from public.bookings b
      where b.id = job_payments.booking_id
        and (b.mechanic_id = (select auth.uid()) or b.customer_id = (select auth.uid()))
    )
  );

-- A closed job is a financial record: no client writes it directly.
revoke insert, update, delete on public.job_payments from authenticated, anon;

-- Signatures: private. Stored as <booking_id>/<file>.png.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-signatures', 'booking-signatures', false, 1048576, array['image/png'])
on conflict (id) do nothing;

drop policy if exists "booking signatures insert" on storage.objects;
create policy "booking signatures insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'booking-signatures'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.mechanic_id = (select auth.uid()) or (select public.current_user_role()) = 'admin')
    )
  );

drop policy if exists "booking signatures read" on storage.objects;
create policy "booking signatures read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-signatures'
    and (
      (select public.current_user_role()) = 'admin'
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and (b.mechanic_id = (select auth.uid()) or b.customer_id = (select auth.uid()))
      )
    )
  );

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
  v_sig text := nullif(trim(coalesce(p_payment->>'signature_path', '')), '');
  v_signer text := nullif(left(trim(coalesce(p_payment->>'signer_name', '')), 120), '');
  v_notes text := nullif(left(trim(coalesce(p_payment->>'tech_notes', '')), 2000), '');
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
  end if;

  if greatest(v_diag, v_travel, v_labor_total, v_parts_total) > c_cap then
    raise exception 'An amount is too large — check the numbers';
  end if;

  v_before_tax := v_diag + v_travel + v_labor_total + v_parts_total;
  -- Same integer rounding as taxOn() in src/services/closeOut.ts.
  v_tax := case v_tax_mode
    when 'parts' then (v_parts_total * 825 + 5000) / 10000
    when 'total' then (v_before_tax * 825 + 5000) / 10000
    else 0
  end;
  v_total := v_before_tax + v_tax;
  v_payout := ((v_diag + v_travel + v_labor_total) * 70 + 50) / 100
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
    booking_id, kind, line_items, diagnostic_cents, travel_cents, labor_cents, parts_cents,
    tax_mode, tax_cents, total_cents, parts_by, tech_payout_cents, tech_notes,
    signer_name, signature_path, signed_at, recorded_by
  ) values (
    p_booking_id, v_kind, v_lines, v_diag, v_travel, v_labor_total, v_parts_total,
    v_tax_mode, v_tax, v_total, v_parts_by, v_payout, v_notes,
    v_signer, v_sig, case when v_sig is not null then now() end, v_uid
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
    'tech_payout_cents', v_payout,
    'line_items', v_lines
  );
end;
$$;

revoke all on function public.record_job_payment(uuid, jsonb) from public, anon;
grant execute on function public.record_job_payment(uuid, jsonb) to authenticated;
