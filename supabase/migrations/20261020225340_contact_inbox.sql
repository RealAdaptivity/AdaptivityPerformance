-- The contact form has saved messages since it was built, but nothing showed
-- them to anyone: no admin screen and no alert. This backs the new Inbox tab.
--
-- topic: 'contact' for the Contact Us form, 'membership' for membership
--   sign-up requests, which used to open the customer's email app and were
--   lost whenever they did not press send.
-- status: 'new' until someone replies, then 'replied', then 'closed'.

alter table public.contact_inquiries
  add column if not exists topic text not null default 'contact',
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid references public.profiles (id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contact_inquiries_topic_check') then
    alter table public.contact_inquiries
      add constraint contact_inquiries_topic_check check (topic in ('contact', 'membership'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contact_inquiries_status_check') then
    alter table public.contact_inquiries
      add constraint contact_inquiries_status_check check (status in ('new', 'replied', 'closed'));
  end if;
end $$;

comment on column public.contact_inquiries.topic is 'contact (Contact Us form) or membership (membership sign-up request).';
comment on column public.contact_inquiries.handled_at is 'When an admin last marked it replied or closed.';

-- A new message goes to the same Telegram chats as new bookings. Like the
-- booking alert, it never blocks the insert: a lost alert beats a lost message.
create or replace function public.notify_telegram_contact_inquiry()
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
    body := jsonb_build_object('action', 'contact', 'inquiry_id', new.id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-key', v_key),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  raise warning 'notify_telegram_contact_inquiry failed: %', sqlerrm;
  return new;
end;
$fn$;
revoke execute on function public.notify_telegram_contact_inquiry() from public, anon, authenticated;

create or replace trigger contact_inquiries_notify_telegram
  after insert on public.contact_inquiries
  for each row execute function public.notify_telegram_contact_inquiry();
