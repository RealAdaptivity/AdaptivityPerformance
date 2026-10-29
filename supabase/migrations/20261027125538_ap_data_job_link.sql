-- AP Data: tie a confirmed fix or a vehicle note to the Adaptivity job it came
-- from, by the booking's reference code. The tech job screen opens AP Data with
-- the job's vehicle and complaint, and lists the fixes recorded for that job.
--
-- Plain text rather than a foreign key: AP Data's tables do not depend on the
-- booking tables, and a fix stays useful if the booking is ever archived.
set lock_timeout = '15s';

alter table public.repair_fixes
  add column if not exists job_ref text
  constraint repair_fixes_job_ref_shape check (job_ref is null or job_ref ~ '^[A-Za-z0-9-]{3,40}$');

alter table public.vehicle_notes
  add column if not exists job_ref text
  constraint vehicle_notes_job_ref_shape check (job_ref is null or job_ref ~ '^[A-Za-z0-9-]{3,40}$');

create index if not exists repair_fixes_job_ref_idx on public.repair_fixes (job_ref) where job_ref is not null;
create index if not exists vehicle_notes_job_ref_idx on public.vehicle_notes (job_ref) where job_ref is not null;
create index if not exists repair_fixes_vin_idx on public.repair_fixes (vin) where vin is not null;
create index if not exists vehicle_notes_vin_idx on public.vehicle_notes (vin) where vin is not null;
create index if not exists bookings_vin_idx on public.bookings (upper(vin)) where vin is not null;
