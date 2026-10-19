-- Telegram booking alerts (see supabase/functions/telegram-bot). Applied to
-- the project on 2026-10-12; saved here so the repo matches the database.
create table if not exists public.telegram_bot_config (
  id boolean primary key default true check (id),
  internal_key text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  webhook_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  link_code text not null default encode(extensions.gen_random_bytes(8), 'hex'),
  bot_username text,
  updated_at timestamptz not null default now()
);
insert into public.telegram_bot_config (id) values (true) on conflict (id) do nothing;
alter table public.telegram_bot_config enable row level security;
revoke all on public.telegram_bot_config from anon, authenticated;

create table if not exists public.telegram_subscribers (
  chat_id bigint primary key,
  chat_title text,
  chat_type text,
  added_by text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.telegram_subscribers enable row level security;
revoke all on public.telegram_subscribers from anon, authenticated;
