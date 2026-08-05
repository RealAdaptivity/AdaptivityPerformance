-- multi = can claim multiple active jobs; standalone = one active job at a time (changeable anytime)
ALTER TABLE public.mechanic_details
  ADD COLUMN IF NOT EXISTS job_capacity text NOT NULL DEFAULT 'multi'
  CHECK (job_capacity IN ('multi', 'standalone'));

COMMENT ON COLUMN public.mechanic_details.job_capacity IS
  'multi = take multiple jobs; standalone = one active job at a time. Tech can change in Settings.';
