-- Payment operations hardening: dispute metadata and scheduled expired-hold cleanup.
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.payments
  add column if not exists stripe_dispute_id text,
  add column if not exists dispute_status text;

create index if not exists payments_stripe_dispute_id_idx
  on public.payments (stripe_dispute_id)
  where stripe_dispute_id is not null;

do $$
begin
  perform cron.unschedule('cleanup-expired-booking-holds');
exception when others then
  null;
end $$;

select cron.schedule(
  'cleanup-expired-booking-holds',
  '*/15 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_project_url' limit 1)
        || '/functions/v1/cleanup-expired-holds',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_anon_key' limit 1),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'adaptivity_cleanup_cron_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $schedule$
);
