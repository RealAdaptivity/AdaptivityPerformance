-- The $20 fee on a mobile visit stays the travel fee. The severe weather fee
-- migration briefly described travel_cents as a renamed "service fee"; that
-- rename was dropped before it shipped.
comment on column public.job_payments.travel_cents is
  'The flat travel fee on a mobile visit (none on a shop drop-off or for members).';
