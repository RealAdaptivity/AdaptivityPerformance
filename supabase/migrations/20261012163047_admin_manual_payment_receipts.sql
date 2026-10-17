-- Receipt numbers (R-1001, R-1002, ...) and proof-of-payment fields for cash / Zelle.
create sequence if not exists public.receipt_number_seq start 1001;

alter table public.job_payments
  add column if not exists receipt_number text unique default ('R-' || nextval('public.receipt_number_seq')::text),
  add column if not exists zelle_confirmation text check (zelle_confirmation is null or length(trim(zelle_confirmation)) between 1 and 80),
  add column if not exists zelle_sender_name text check (zelle_sender_name is null or length(trim(zelle_sender_name)) between 1 and 120),
  add column if not exists cash_received_cents integer check (cash_received_cents is null or cash_received_cents >= 0),
  add column if not exists cash_change_cents integer check (cash_change_cents is null or cash_change_cents >= 0),
  add column if not exists received_by uuid references public.profiles(id),
  add column if not exists payment_proof_path text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references public.profiles(id);

comment on column public.job_payments.receipt_number is 'Customer-facing receipt number, R-1001 and up.';
comment on column public.job_payments.zelle_confirmation is 'Zelle confirmation / reference number from the bank app. Required for zelle receipts.';
comment on column public.job_payments.received_by is 'Who actually took the money (tech or admin).';
comment on column public.job_payments.payment_proof_path is 'Optional screenshot of the Zelle confirmation, path starts with the booking id.';

-- Audit trail: every admin change to a payment, before and after.
create table if not exists public.job_payment_audit (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  changed_by uuid references public.profiles(id),
  action text not null,
  before_row jsonb,
  after_row jsonb,
  changed_at timestamptz not null default now()
);
alter table public.job_payment_audit enable row level security;
create policy "admins read payment audit" on public.job_payment_audit
  for select to authenticated using (public.current_user_role() = 'admin');

-- Admin-only: mark a job's payment as cash or Zelle and attach proof.
-- Works on open jobs (after record_job_payment closes them) and on jobs a tech already closed.
-- Amounts are not changed here; card (Square-verified) payments cannot be overridden.
create or replace function public.admin_confirm_manual_payment(p_booking_id uuid, p_details jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.job_payments%rowtype;
  v_after public.job_payments%rowtype;
  v_method text := coalesce(p_details->>'payment_method', '');
  v_conf text := nullif(left(trim(coalesce(p_details->>'zelle_confirmation', '')), 80), '');
  v_sender text := nullif(left(trim(coalesce(p_details->>'zelle_sender_name', '')), 120), '');
  v_cash bigint := nullif(p_details->>'cash_received_cents', '')::bigint;
  v_received_by uuid := coalesce(nullif(p_details->>'received_by', '')::uuid, v_uid);
  v_proof text := nullif(trim(coalesce(p_details->>'payment_proof_path', '')), '');
  v_due bigint;
begin
  if v_uid is null or public.current_user_role() <> 'admin' then
    raise exception 'Only an admin can record cash or Zelle payments here';
  end if;

  select * into v_row from public.job_payments where booking_id = p_booking_id for update;
  if not found then
    raise exception 'Close out the job first, then record how it was paid';
  end if;
  if v_row.kind = 'no_show' then
    raise exception 'No-show jobs have no payment to record';
  end if;
  if v_row.payment_method = 'card' then
    raise exception 'This job was paid by card through Square and cannot be changed here';
  end if;
  if v_method not in ('cash', 'zelle') then
    raise exception 'Pick Cash or Zelle';
  end if;
  if not exists (select 1 from public.profiles where id = v_received_by and role in ('tech', 'admin')) then
    raise exception 'Received-by must be a tech or admin';
  end if;
  if v_proof is not null and split_part(v_proof, '/', 1) <> p_booking_id::text then
    raise exception 'That screenshot belongs to a different job';
  end if;

  v_due := v_row.total_cents - coalesce(v_row.refunded_cents, 0);

  if v_method = 'zelle' then
    if v_conf is null then
      raise exception 'Enter the Zelle confirmation number';
    end if;
    v_cash := null;
  else
    if v_cash is null then
      v_cash := v_due;
    end if;
    if v_cash < v_due then
      raise exception 'Cash received is less than the total due';
    end if;
    if v_cash > 10000000 then
      raise exception 'An amount is too large — check the numbers';
    end if;
    v_conf := null;
    v_sender := null;
  end if;

  update public.job_payments set
    payment_method = v_method,
    zelle_confirmation = v_conf,
    zelle_sender_name = v_sender,
    cash_received_cents = v_cash,
    cash_change_cents = case when v_method = 'cash' then v_cash - v_due end,
    received_by = v_received_by,
    payment_proof_path = case when v_method = 'zelle' then coalesce(v_proof, payment_proof_path) end,
    payment_confirmed_at = now(),
    payment_confirmed_by = v_uid,
    receipt_texted_at = null,
    receipt_emailed_at = null
  where booking_id = p_booking_id
  returning * into v_after;

  insert into public.job_payment_audit (booking_id, changed_by, action, before_row, after_row)
  values (p_booking_id, v_uid, 'confirm_' || v_method, to_jsonb(v_row), to_jsonb(v_after));

  return jsonb_build_object(
    'receipt_number', v_after.receipt_number,
    'payment_method', v_after.payment_method,
    'total_cents', v_after.total_cents,
    'cash_received_cents', v_after.cash_received_cents,
    'cash_change_cents', v_after.cash_change_cents,
    'zelle_confirmation', v_after.zelle_confirmation
  );
end;
$$;

revoke all on function public.admin_confirm_manual_payment(uuid, jsonb) from public, anon;
grant execute on function public.admin_confirm_manual_payment(uuid, jsonb) to authenticated;
