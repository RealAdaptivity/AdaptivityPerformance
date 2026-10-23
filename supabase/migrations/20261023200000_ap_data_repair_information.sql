-- AP Data: the shop's own repair-information database.
--
-- AP Data (the RealAdaptivity/APData web app) gives techs one place to look
-- up a vehicle: NHTSA recalls and complaints (through the vehicle-research
-- edge function), a trouble-code library, and what this shop has learned on
-- earlier jobs. This migration holds that shop knowledge:
--
--   repair_fixes              confirmed fixes: vehicle + codes + symptom → root cause and fix
--   repair_fix_confirmations  "it fixed mine too", one per tech per fix
--   repair_procedures         shop-written procedures, optionally scoped to a make/model/years
--   vehicle_specs             torque, fluid and capacity figures a tech recorded, with a second-tech check
--   labor_times               book hours (admin) and actual hours (any tech) per job
--   repair_files              component photos, diagrams and PDFs per vehicle (bucket repair-files)
--   dtc_definitions           code meanings the generic library lacks, e.g. manufacturer P1xxx codes
--
-- Everything is staff only, like vehicle_notes: admins and techs read and add,
-- the author or an admin edits and deletes. Customers and anonymous visitors
-- see none of it. Category names (system, spec category) are owned by the app,
-- so they are shape-checked here rather than listed, and adding one in the app
-- does not need a migration.
--
-- Additive only: no existing table, policy or function changes.

-- ---------------------------------------------------------------------------
-- Confirmed fixes
-- ---------------------------------------------------------------------------

create table if not exists public.repair_fixes (
  id uuid primary key default gen_random_uuid(),
  model_year smallint not null check (model_year between 1950 and 2100),
  make text not null check (length(trim(make)) between 1 and 60),
  model text not null check (length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  mileage integer check (mileage is null or mileage between 0 and 2000000),
  system text not null check (system ~ '^[a-z_]{2,30}$'),
  dtc_codes text[] not null default '{}'
    check (
      cardinality(dtc_codes) <= 20
      and array_position(dtc_codes, null) is null
      and array_to_string(dtc_codes, ',') ~ '^([PBCU][0-9A-F]{4}(,[PBCU][0-9A-F]{4})*)?$'
    ),
  symptom text not null check (length(trim(symptom)) between 3 and 2000),
  tests_performed text check (tests_performed is null or length(tests_performed) <= 4000),
  root_cause text not null check (length(trim(root_cause)) between 3 and 2000),
  fix text not null check (length(trim(fix)) between 3 and 2000),
  parts text check (parts is null or length(parts) <= 2000),
  labor_hours numeric(5, 2) check (labor_hours is null or (labor_hours > 0 and labor_hours <= 100)),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector(
      'english'::regconfig,
      coalesce(symptom, '') || ' ' || coalesce(root_cause, '') || ' ' || coalesce(fix, '') || ' ' ||
      coalesce(parts, '') || ' ' || coalesce(tests_performed, '')
    )
  ) stored
);

comment on table public.repair_fixes is
  'AP Data confirmed fixes: what was wrong and what fixed it, per vehicle, with the trouble codes it set. Staff only.';

create index if not exists repair_fixes_vehicle_idx
  on public.repair_fixes (lower(make), lower(model), model_year);
create index if not exists repair_fixes_codes_idx on public.repair_fixes using gin (dtc_codes);
create index if not exists repair_fixes_search_idx on public.repair_fixes using gin (search);
create index if not exists repair_fixes_created_by_idx on public.repair_fixes (created_by);

drop trigger if exists repair_fixes_set_updated_at on public.repair_fixes;
create trigger repair_fixes_set_updated_at
  before update on public.repair_fixes
  for each row execute function public.set_updated_at();

alter table public.repair_fixes enable row level security;

create policy repair_fixes_staff_read on public.repair_fixes
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy repair_fixes_staff_insert on public.repair_fixes
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy repair_fixes_author_update on public.repair_fixes
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

create policy repair_fixes_author_delete on public.repair_fixes
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.repair_fixes from anon, authenticated;
grant select, insert, delete on public.repair_fixes to authenticated;
-- Column grant: an edit changes what the fix says, never who wrote it or when.
grant update (
  model_year, make, model, engine, vin, mileage, system, dtc_codes,
  symptom, tests_performed, root_cause, fix, parts, labor_hours
) on public.repair_fixes to authenticated;

-- One confirmation per tech per fix. The author's own fix already counts as
-- the first one, so the author cannot confirm it again.
create table if not exists public.repair_fix_confirmations (
  fix_id uuid not null references public.repair_fixes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  note text check (note is null or length(note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (fix_id, user_id)
);

comment on table public.repair_fix_confirmations is
  'AP Data: a tech saying a confirmed fix also fixed their vehicle. Ranks fixes. Staff only.';

create index if not exists repair_fix_confirmations_user_idx on public.repair_fix_confirmations (user_id);

alter table public.repair_fix_confirmations enable row level security;

create policy repair_fix_confirmations_staff_read on public.repair_fix_confirmations
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy repair_fix_confirmations_staff_insert on public.repair_fix_confirmations
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and user_id = (select auth.uid())
    and not exists (
      select 1 from public.repair_fixes f
      where f.id = repair_fix_confirmations.fix_id and f.created_by = (select auth.uid())
    )
  );

create policy repair_fix_confirmations_own_delete on public.repair_fix_confirmations
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.repair_fix_confirmations from anon, authenticated;
grant select, insert, delete on public.repair_fix_confirmations to authenticated;

-- ---------------------------------------------------------------------------
-- Shop procedures
-- ---------------------------------------------------------------------------

-- A procedure with no make applies to every vehicle; with a make and no model,
-- to that make; year_from / year_to narrow it further. steps is an array of
-- {"text": "..."}, specs an array of {"label": "...", "value": "..."}.
create table if not exists public.repair_procedures (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 160),
  system text not null check (system ~ '^[a-z_]{2,30}$'),
  make text check (make is null or length(trim(make)) between 1 and 60),
  model text check (model is null or length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  year_from smallint check (year_from is null or year_from between 1950 and 2100),
  year_to smallint check (year_to is null or year_to between 1950 and 2100),
  summary text check (summary is null or length(summary) <= 2000),
  tools text check (tools is null or length(tools) <= 2000),
  warnings text check (warnings is null or length(warnings) <= 2000),
  steps jsonb not null default '[]'::jsonb
    check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 200),
  specs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 200),
  notes text check (notes is null or length(notes) <= 8000),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(tools, '') || ' ' || coalesce(notes, '')
    )
  ) stored,
  check (model is null or make is not null),
  check (year_from is null or year_to is null or year_from <= year_to)
);

comment on table public.repair_procedures is
  'AP Data shop-written repair procedures, generic or scoped to a make / model / year range. Staff only.';

create index if not exists repair_procedures_vehicle_idx
  on public.repair_procedures (lower(make), lower(model));
create index if not exists repair_procedures_search_idx on public.repair_procedures using gin (search);
create index if not exists repair_procedures_created_by_idx on public.repair_procedures (created_by);
create index if not exists repair_procedures_updated_by_idx on public.repair_procedures (updated_by);

drop trigger if exists repair_procedures_set_updated_at on public.repair_procedures;
create trigger repair_procedures_set_updated_at
  before update on public.repair_procedures
  for each row execute function public.set_updated_at();

alter table public.repair_procedures enable row level security;

create policy repair_procedures_staff_read on public.repair_procedures
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy repair_procedures_staff_insert on public.repair_procedures
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy repair_procedures_author_update on public.repair_procedures
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and updated_by = (select auth.uid())
  );

create policy repair_procedures_author_delete on public.repair_procedures
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.repair_procedures from anon, authenticated;
grant select, insert, delete on public.repair_procedures to authenticated;
grant update (
  title, system, make, model, engine, year_from, year_to,
  summary, tools, warnings, steps, specs, notes, updated_by
) on public.repair_procedures to authenticated;

-- ---------------------------------------------------------------------------
-- Vehicle specs
-- ---------------------------------------------------------------------------

-- A spec one tech typed in is a claim; a second tech checking it against the
-- service information makes it verified. verified_* are set only through
-- verify_vehicle_spec(), which refuses the spec's own author.
create table if not exists public.vehicle_specs (
  id uuid primary key default gen_random_uuid(),
  model_year smallint not null check (model_year between 1950 and 2100),
  make text not null check (length(trim(make)) between 1 and 60),
  model text not null check (length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  category text not null check (category ~ '^[a-z_]{2,30}$'),
  label text not null check (length(trim(label)) between 1 and 120),
  value text not null check (length(trim(value)) between 1 and 200),
  source text check (source is null or length(source) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  check ((verified_by is null) = (verified_at is null))
);

comment on table public.vehicle_specs is
  'AP Data specs per vehicle (torque, fluids, capacities) recorded by techs; verified once a second tech checks them. Staff only.';

create index if not exists vehicle_specs_vehicle_idx
  on public.vehicle_specs (lower(make), lower(model), model_year);
create index if not exists vehicle_specs_created_by_idx on public.vehicle_specs (created_by);
create index if not exists vehicle_specs_verified_by_idx on public.vehicle_specs (verified_by);

alter table public.vehicle_specs enable row level security;

create policy vehicle_specs_staff_read on public.vehicle_specs
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy vehicle_specs_staff_insert on public.vehicle_specs
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
    and verified_by is null
    and verified_at is null
  );

create policy vehicle_specs_author_update on public.vehicle_specs
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

create policy vehicle_specs_author_delete on public.vehicle_specs
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.vehicle_specs from anon, authenticated;
grant select, insert, delete on public.vehicle_specs to authenticated;
-- Column grant: an edit can change what the spec says, never who verified it.
grant update (engine, category, label, value, source) on public.vehicle_specs to authenticated;

-- Editing a verified spec's figure un-verifies it: the check was of the old value.
create or replace function public.vehicle_specs_reset_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.value is distinct from old.value
     or new.label is distinct from old.label
     or new.engine is distinct from old.engine then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicle_specs_reset_verification on public.vehicle_specs;
create trigger vehicle_specs_reset_verification
  before update on public.vehicle_specs
  for each row execute function public.vehicle_specs_reset_verification();

revoke all on function public.vehicle_specs_reset_verification() from public, anon, authenticated;

create or replace function public.verify_vehicle_spec(p_spec_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role()::text, '') not in ('admin', 'tech') then
    raise exception 'Only Adaptivity staff can verify specs';
  end if;
  update public.vehicle_specs
     set verified_by = auth.uid(), verified_at = now()
   where id = p_spec_id
     and verified_at is null
     and created_by is distinct from auth.uid();
  if not found then
    raise exception 'That spec is already verified, or you added it yourself — another tech has to check it';
  end if;
end;
$$;

revoke all on function public.verify_vehicle_spec(uuid) from public, anon;
grant execute on function public.verify_vehicle_spec(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Labor times
-- ---------------------------------------------------------------------------

-- 'book' hours are what the shop charges for a job: admin only, and may be
-- generic (no vehicle) or narrowed to a make, model or year. 'actual' hours are
-- what a job really took, logged by the tech who did it, always for a vehicle.
-- job_code comes from the app's job catalog.
create table if not exists public.labor_times (
  id uuid primary key default gen_random_uuid(),
  job_code text not null check (job_code ~ '^[a-z0-9_]{2,60}$'),
  kind text not null check (kind in ('book', 'actual')),
  model_year smallint check (model_year is null or model_year between 1950 and 2100),
  make text check (make is null or length(trim(make)) between 1 and 60),
  model text check (model is null or length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  hours numeric(5, 2) not null check (hours > 0 and hours <= 100),
  note text check (note is null or length(note) <= 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (model is null or make is not null),
  check (kind = 'book' or (model_year is not null and make is not null and model is not null))
);

comment on table public.labor_times is
  'AP Data labor guide: book hours the shop charges (admin) and actual hours techs logged, per job code. Staff only.';

create index if not exists labor_times_job_idx
  on public.labor_times (job_code, lower(make), lower(model));
create index if not exists labor_times_created_by_idx on public.labor_times (created_by);

alter table public.labor_times enable row level security;

create policy labor_times_staff_read on public.labor_times
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy labor_times_staff_insert on public.labor_times
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (select public.current_user_role()) = 'admin'::public.user_role
      or (kind = 'actual' and (select public.current_user_role()) = 'tech'::public.user_role)
    )
  );

create policy labor_times_author_delete on public.labor_times
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.labor_times from anon, authenticated;
grant select, insert, delete on public.labor_times to authenticated;

-- ---------------------------------------------------------------------------
-- Shop files: component photos, diagrams, PDFs
-- ---------------------------------------------------------------------------

create table if not exists public.repair_files (
  id uuid primary key default gen_random_uuid(),
  model_year smallint check (model_year is null or model_year between 1950 and 2100),
  make text check (make is null or length(trim(make)) between 1 and 60),
  model text check (model is null or length(trim(model)) between 1 and 80),
  engine text check (engine is null or length(trim(engine)) between 1 and 80),
  system text not null check (system ~ '^[a-z_]{2,30}$'),
  title text not null check (length(trim(title)) between 1 and 160),
  description text check (description is null or length(description) <= 2000),
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,200}$'),
  mime_type text not null check (length(mime_type) between 3 and 100),
  size_bytes integer not null check (size_bytes between 1 and 26214400),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (model is null or make is not null)
);

comment on table public.repair_files is
  'AP Data shop library: photos, diagrams and PDFs per vehicle, stored in the private repair-files bucket under <uploader id>/. Staff only.';

create index if not exists repair_files_vehicle_idx
  on public.repair_files (lower(make), lower(model), model_year);
create index if not exists repair_files_created_by_idx on public.repair_files (created_by);

alter table public.repair_files enable row level security;

create policy repair_files_staff_read on public.repair_files
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy repair_files_staff_insert on public.repair_files
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );

create policy repair_files_author_delete on public.repair_files
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.repair_files from anon, authenticated;
grant select, insert, delete on public.repair_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-files',
  'repair-files',
  false,
  26214400, -- 25 MB: a phone photo or a multi-page diagram PDF
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists "repair files staff read" on storage.objects;
create policy "repair files staff read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repair-files'
    and (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

-- Uploads go under the uploader's own folder, so a delete can be scoped to it.
drop policy if exists "repair files staff upload" on storage.objects;
create policy "repair files staff upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repair-files'
    and (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "repair files owner delete" on storage.objects;
create policy "repair files owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'repair-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.current_user_role()) = 'admin'::public.user_role
    )
  );

-- ---------------------------------------------------------------------------
-- Shop code definitions
-- ---------------------------------------------------------------------------

-- The app ships the generic (SAE) code meanings. Manufacturer codes (P1xxx,
-- most B, C and U codes) mean different things per make, so the shop records
-- them here as it meets them. make null = applies to every make.
create table if not exists public.dtc_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[PBCU][0-9A-F]{4}$'),
  make text check (make is null or length(trim(make)) between 1 and 60),
  title text not null check (length(trim(title)) between 3 and 200),
  notes text check (notes is null or length(notes) <= 4000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dtc_definitions is
  'AP Data shop-recorded trouble-code meanings, mostly manufacturer-specific codes, optionally per make. Staff only.';

create unique index if not exists dtc_definitions_code_make_key
  on public.dtc_definitions (code, coalesce(lower(make), ''));
create index if not exists dtc_definitions_created_by_idx on public.dtc_definitions (created_by);

drop trigger if exists dtc_definitions_set_updated_at on public.dtc_definitions;
create trigger dtc_definitions_set_updated_at
  before update on public.dtc_definitions
  for each row execute function public.set_updated_at();

alter table public.dtc_definitions enable row level security;

create policy dtc_definitions_staff_read on public.dtc_definitions
  for select to authenticated
  using ((select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role));

create policy dtc_definitions_staff_insert on public.dtc_definitions
  for insert to authenticated
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
    and created_by = (select auth.uid())
  );

create policy dtc_definitions_author_update on public.dtc_definitions
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  )
  with check (
    (select public.current_user_role()) in ('admin'::public.user_role, 'tech'::public.user_role)
  );

create policy dtc_definitions_author_delete on public.dtc_definitions
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.current_user_role()) = 'admin'::public.user_role
  );

revoke all on public.dtc_definitions from anon, authenticated;
grant select, insert, delete on public.dtc_definitions to authenticated;
grant update (code, make, title, notes) on public.dtc_definitions to authenticated;
