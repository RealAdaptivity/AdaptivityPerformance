-- Posts each new booking to the telegram-bot function. Applied to the project
-- on 2026-10-12; saved here so the repo matches the database.
create or replace function public.notify_telegram_new_booking()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_key text;
begin
  select internal_key into v_key from public.telegram_bot_config where id;
  if v_key is null then
    return new;
  end if;
  perform net.http_post(
    url := 'https://qqyairzymqpkbfxobztx.supabase.co/functions/v1/telegram-bot',
    body := jsonb_build_object('action', 'notify', 'booking_id', new.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-key', v_key),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  raise warning 'notify_telegram_new_booking failed: %', sqlerrm;
  return new;
end;
$fn$;
revoke execute on function public.notify_telegram_new_booking() from public, anon, authenticated;
