-- Payment terms changed materially: money is now collected in person and there is
-- no Connect payout account, so the signed agreement text changed and the version
-- has to move with it. The claim gate compares this row against the app constant,
-- so it must be updated in lockstep or every technician is locked out.
insert into public.app_config (key, value)
values ('contractor_agreement_version', '2026-09-v3')
on conflict (key) do update set value = excluded.value;
