-- Personal Vehicle Usage & Insurance Disclosure, signed by field technicians.
--
-- Separate from the contractor agreement because it is a different document
-- with its own version and its own expiry: the contractor agreement goes stale
-- when its text changes, this one also goes stale when the policy it discloses
-- runs out. A disclosure naming a policy that expired last month is not proof
-- of insurance.
create table if not exists public.vehicle_insurance_disclosures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- The disclosure table from the form.
  vehicle_description text not null,
  license_plate text not null,
  license_plate_state text not null,
  insurance_carrier text not null,
  policy_number text not null,
  policy_expires_on date not null,

  -- E-SIGN record.
  signer_name text not null,
  signature_path text not null,
  signed_at timestamptz not null default now(),
  disclosure_version text not null,
  user_agent text,

  -- Countersigned by the company; stored on the row so a copy pulled years
  -- later still says who accepted it, even if the constant changes.
  company_representative_name text not null,
  company_representative_title text,

  created_at timestamptz not null default now()
);

comment on table public.vehicle_insurance_disclosures is
  'Signed personal-vehicle insurance disclosures. A row is current only if disclosure_version matches the app constant AND policy_expires_on is in the future.';
comment on column public.vehicle_insurance_disclosures.policy_expires_on is
  'Real date, not free text, so an expired policy can be detected rather than sitting on file looking valid.';

-- The newest disclosure per technician is what the gate reads.
create index if not exists vehicle_insurance_disclosures_profile_signed_idx
  on public.vehicle_insurance_disclosures (profile_id, signed_at desc);

alter table public.vehicle_insurance_disclosures enable row level security;

-- A technician may file their own and read their own back.
drop policy if exists "vid insert own" on public.vehicle_insurance_disclosures;
create policy "vid insert own"
  on public.vehicle_insurance_disclosures for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "vid select own or admin" on public.vehicle_insurance_disclosures;
create policy "vid select own or admin"
  on public.vehicle_insurance_disclosures for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- Signed records are evidence: nobody edits or deletes one from the client.
-- A correction is a new signature, which is what the form is for.
revoke update, delete on public.vehicle_insurance_disclosures from authenticated, anon;
