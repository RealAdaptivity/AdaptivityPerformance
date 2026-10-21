import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * telegram-bot
 *
 * Sends a Telegram message to the team whenever a new booking is created, and
 * whenever someone sends a message or a membership request from the website.
 *
 * Three kinds of caller, each authenticated differently (verify_jwt is off):
 *
 *  1. The database. AFTER INSERT triggers post with the x-internal-key header
 *     from public.telegram_bot_config: bookings_notify_telegram sends
 *     { action: 'notify', booking_id }, contact_inquiries_notify_telegram
 *     sends { action: 'contact', inquiry_id }.
 *  2. Telegram itself. The bot's webhook points here and every update carries
 *     X-Telegram-Bot-Api-Secret-Token, checked against webhook_secret.
 *  3. An admin running { action: 'setup' | 'test' } with the same internal key.
 *
 * A chat only receives alerts after it has been linked with the private link
 * code (/start <code>, which the t.me ...?startgroup=<code> link sends
 * automatically). Anyone else who finds the bot gets nothing: the alerts
 * contain customer names, phones and addresses.
 *
 * Secrets: TELEGRAM_BOT_TOKEN (from @BotFather). SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */

const SITE = (Deno.env.get('ADAPTIVITY_SITE_ORIGIN')?.trim() || 'https://adaptivityperformance.com').replace(/\/$/, '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const FN_URL = `${SUPABASE_URL}/functions/v1/telegram-bot`;
const TZ = 'America/Chicago';

const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

type Config = {
  internal_key: string;
  webhook_secret: string;
  link_code: string;
  bot_username: string | null;
};

type TgResponse = {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
  parameters?: { migrate_to_chat_id?: number };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getConfig(): Promise<Config> {
  const { data, error } = await supabase
    .from('telegram_bot_config')
    .select('internal_key, webhook_secret, link_code, bot_username')
    .eq('id', true)
    .single();
  if (error || !data) throw new Error('telegram_bot_config row is missing');
  return data as Config;
}

async function tg(method: string, payload: Record<string, unknown>): Promise<TgResponse> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim();
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not set' };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as TgResponse;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function formatPhone(raw: string | null): string {
  const d = (raw ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw || 'No phone';
}

/** '2026-10-14' -> 'Wed Oct 14'. Built from the parts so it never shifts a day. */
function formatDay(iso: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1) return null;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type Booking = {
  id: string;
  reference_code: string;
  booking_source: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string;
  zip_code: string | null;
  vehicle_description: string | null;
  vin: string | null;
  services: unknown;
  total_estimate: number | string | null;
  location_type: string | null;
  quote_status: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  issue_description: string | null;
  customer_notes: string | null;
  media_paths: string[] | null;
  created_at: string;
};

const BOOKING_COLUMNS =
  'id, reference_code, booking_source, customer_name, customer_phone, customer_email, customer_address, zip_code, vehicle_description, vin, services, total_estimate, location_type, quote_status, preferred_date, preferred_time_window, issue_description, customer_notes, media_paths, created_at';

function buildMessage(b: Booking, label = 'New booking') {
  const services = Array.isArray(b.services) ? (b.services as unknown[]).map(String).filter(Boolean) : [];
  const shop = b.location_type === 'shop';
  const received = new Date(b.created_at).toLocaleString('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const day = formatDay(b.preferred_date);
  const when = [day, b.preferred_time_window?.trim()].filter(Boolean).join(' · ') || 'Flexible / not specified';
  const address = b.zip_code && !b.customer_address.includes(b.zip_code)
    ? `${b.customer_address} ${b.zip_code}`
    : b.customer_address;
  const estimate = Number(b.total_estimate ?? 0);
  const photos = b.media_paths?.length ?? 0;

  const lines: string[] = [
    `🔔 <b>${esc(label)} — ${esc(b.reference_code || 'no ref')}</b>`,
    `<i>${b.booking_source === 'phone' ? '📞 Phone booking' : '🌐 Booked online'} · ${esc(received)}</i>`,
    '',
    `👤 <b>${esc(b.customer_name)}</b>`,
    `📞 ${esc(formatPhone(b.customer_phone))}`,
  ];
  if (b.customer_email) lines.push(`✉️ ${esc(b.customer_email)}`);
  lines.push(`📍 ${esc(address)}`, `${shop ? '🏪 Shop drop-off' : '🚐 Mobile visit'}`, '');
  lines.push(`🚗 ${esc(b.vehicle_description || 'Vehicle not specified')}`);
  if (b.vin) lines.push(`🔢 VIN ${esc(b.vin)}`);
  lines.push(`🔧 ${esc(services.join(', ') || 'Service not specified')}`);
  lines.push(`🗓 ${esc(when)}`);
  if (b.issue_description?.trim()) lines.push(`💬 ${esc(clip(b.issue_description.trim(), 700))}`);
  if (b.customer_notes?.trim()) lines.push(`📝 ${esc(clip(b.customer_notes.trim(), 400))}`);
  if (photos) lines.push(`📷 ${photos} photo${photos === 1 ? '' : 's'}/video attached (see dispatch)`);
  if (estimate > 0) {
    lines.push(
      `💵 $${estimate.toFixed(0)} ${b.quote_status === 'awaiting_diagnostic' ? 'diagnostic' : 'estimate'}${shop ? '' : ' + travel'} · paid in person`
    );
  }

  const keyboard = [
    [
      { text: '🖥 Open dispatch', url: `${SITE}/admin` },
      {
        text: '🗺 Map',
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      },
    ],
  ];

  return { text: clip(lines.join('\n'), 4000), reply_markup: { inline_keyboard: keyboard } };
}

/** Send to one chat, following a group→supergroup migration and dropping
 *  chats that removed or blocked the bot. */
async function sendToChat(chatId: number, message: Record<string, unknown>): Promise<boolean> {
  let res = await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...message,
  });
  const migrated = res.parameters?.migrate_to_chat_id;
  if (!res.ok && migrated) {
    await supabase.from('telegram_subscribers').update({ chat_id: migrated, updated_at: new Date().toISOString() }).eq('chat_id', chatId);
    res = await tg('sendMessage', { chat_id: migrated, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...message });
  }
  if (!res.ok) {
    console.error(`[telegram-bot] send to ${chatId} failed:`, res.error_code, res.description);
    if (res.error_code === 403) {
      await supabase.from('telegram_subscribers').update({ active: false, updated_at: new Date().toISOString() }).eq('chat_id', chatId);
    }
  }
  return res.ok;
}

async function broadcast(message: Record<string, unknown>) {
  const { data: subs } = await supabase.from('telegram_subscribers').select('chat_id').eq('active', true);
  const ids = (subs ?? []).map((s) => Number(s.chat_id));
  const results = await Promise.all(ids.map((id) => sendToChat(id, message)));
  return { chats: ids.length, sent: results.filter(Boolean).length };
}

type Inquiry = {
  id: string;
  topic: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
  issue_description: string;
  sms_consent: boolean | null;
  created_at: string;
};

function buildInquiryMessage(q: Inquiry) {
  const received = new Date(q.created_at).toLocaleString('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const membership = q.topic === 'membership';
  const lines: string[] = [
    `${membership ? '⭐ <b>Membership request</b>' : '📨 <b>New message from the website</b>'}`,
    `<i>${esc(received)}</i>`,
    '',
    `👤 <b>${esc(q.full_name)}</b>`,
  ];
  if (q.phone) lines.push(`📞 ${esc(formatPhone(q.phone))}${q.sms_consent === false ? ' (call, do not text)' : ''}`);
  if (q.email) lines.push(`✉️ ${esc(q.email)}`);
  if (q.vehicle) lines.push(`🚗 ${esc(q.vehicle)}`);
  lines.push('', `💬 ${esc(clip(q.issue_description.trim(), 1500))}`);
  return {
    text: clip(lines.join('\n'), 4000),
    reply_markup: { inline_keyboard: [[{ text: '📥 Open inbox', url: `${SITE}/admin` }]] },
  };
}

async function loadBooking(id?: string): Promise<Booking | null> {
  let q = supabase.from('bookings').select(BOOKING_COLUMNS);
  q = id ? q.eq('id', id) : q.order('created_at', { ascending: false }).limit(1);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data as Booking | null;
}

/* ---------- internal actions (database trigger / admin) ---------- */

async function handleInternal(body: any, cfg: Config) {
  switch (body?.action) {
    case 'notify': {
      if (typeof body.booking_id !== 'string') return json({ error: 'booking_id required' }, 400);
      const booking = await loadBooking(body.booking_id);
      if (!booking) return json({ error: 'booking not found' }, 404);
      return json({ ok: true, ...(await broadcast(buildMessage(booking))) });
    }
    case 'contact': {
      if (typeof body.inquiry_id !== 'string') return json({ error: 'inquiry_id required' }, 400);
      const { data: inquiry, error } = await supabase
        .from('contact_inquiries')
        .select('id, topic, full_name, phone, email, vehicle, issue_description, sms_consent, created_at')
        .eq('id', body.inquiry_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!inquiry) return json({ error: 'inquiry not found' }, 404);
      return json({ ok: true, ...(await broadcast(buildInquiryMessage(inquiry as Inquiry))) });
    }
    case 'test': {
      const booking = await loadBooking();
      const msg = booking
        ? buildMessage(booking, '🧪 Test (latest booking)')
        : { text: '🧪 Test: booking alerts are working. No bookings to show yet.' };
      return json({ ok: true, ...(await broadcast(msg)) });
    }
    case 'setup': {
      const me = await tg('getMe', {});
      if (!me.ok) return json({ error: `getMe failed: ${me.description}` }, 400);
      const username = me.result.username as string;
      await supabase
        .from('telegram_bot_config')
        .update({ bot_username: username, updated_at: new Date().toISOString() })
        .eq('id', true);
      const hook = await tg('setWebhook', {
        url: FN_URL,
        secret_token: cfg.webhook_secret,
        allowed_updates: ['message', 'my_chat_member'],
        drop_pending_updates: true,
      });
      const { count } = await supabase
        .from('telegram_subscribers')
        .select('chat_id', { count: 'exact', head: true })
        .eq('active', true);
      return json({
        ok: hook.ok,
        webhook: hook.description,
        bot: `@${username}`,
        group_link: `https://t.me/${username}?startgroup=${cfg.link_code}`,
        private_link: `https://t.me/${username}?start=${cfg.link_code}`,
        active_chats: count ?? 0,
      });
    }
    default:
      return json({ error: 'unknown action' }, 400);
  }
}

/* ---------- Telegram webhook ---------- */

async function isSubscribed(chatId: number) {
  const { data } = await supabase
    .from('telegram_subscribers')
    .select('active')
    .eq('chat_id', chatId)
    .maybeSingle();
  return !!data?.active;
}

async function reply(chatId: number, text: string) {
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

async function handleUpdate(update: any, cfg: Config) {
  const member = update.my_chat_member;
  if (member) {
    const status = member.new_chat_member?.status;
    if (status === 'left' || status === 'kicked') {
      await supabase
        .from('telegram_subscribers')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('chat_id', member.chat.id);
    }
    return;
  }

  const msg = update.message;
  if (!msg?.chat) return;
  const chat = msg.chat;

  if (msg.migrate_to_chat_id) {
    await supabase
      .from('telegram_subscribers')
      .update({ chat_id: msg.migrate_to_chat_id, updated_at: new Date().toISOString() })
      .eq('chat_id', chat.id);
    return;
  }

  const text: string = (msg.text ?? '').trim();
  const m = /^\/([a-z_]+)(?:@(\w+))?(?:\s+([\s\S]*))?$/i.exec(text);
  if (!m) return;
  const [, cmdRaw, addressedTo, argRaw] = m;
  if (addressedTo && cfg.bot_username && addressedTo.toLowerCase() !== cfg.bot_username.toLowerCase()) return;
  const cmd = cmdRaw.toLowerCase();
  const arg = (argRaw ?? '').trim();
  const who = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || null;

  if (cmd === 'start' || cmd === 'subscribe') {
    if (safeEqual(arg, cfg.link_code)) {
      await supabase.from('telegram_subscribers').upsert({
        chat_id: chat.id,
        chat_title: chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || null),
        chat_type: chat.type,
        added_by: who,
        active: true,
        updated_at: new Date().toISOString(),
      });
      await reply(
        chat.id,
        '✅ <b>Booking alerts are on for this chat.</b>\nEvery new booking from adaptivityperformance.com will show up here.\n\n/status: check alerts\n/latest: show the most recent booking\n/stop: turn alerts off'
      );
    } else if (await isSubscribed(chat.id)) {
      await reply(chat.id, '✅ Booking alerts are already on for this chat.');
    } else {
      await reply(chat.id, '🔒 This is a private bot for Adaptivity Performance.');
    }
    return;
  }

  const subscribed = await isSubscribed(chat.id);
  if (cmd === 'status') {
    await reply(chat.id, subscribed ? '✅ Booking alerts are on for this chat.' : '🔕 Booking alerts are off for this chat.');
  } else if (cmd === 'stop' || cmd === 'unsubscribe') {
    if (subscribed) {
      await supabase
        .from('telegram_subscribers')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('chat_id', chat.id);
      await reply(chat.id, '🔕 Booking alerts are off for this chat. Use your setup link again to turn them back on.');
    }
  } else if (cmd === 'latest') {
    if (!subscribed) return;
    const booking = await loadBooking();
    if (booking) await sendToChat(chat.id, buildMessage(booking, 'Latest booking'));
    else await reply(chat.id, 'No bookings yet.');
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let cfg: Config;
  try {
    cfg = await getConfig();
  } catch (e) {
    console.error('[telegram-bot]', e);
    return json({ error: 'not configured' }, 500);
  }

  const tgSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (tgSecret !== null) {
    if (!safeEqual(tgSecret, cfg.webhook_secret)) return json({ error: 'unauthorized' }, 401);
    try {
      await handleUpdate(await req.json(), cfg);
    } catch (e) {
      console.error('[telegram-bot] update error:', e);
    }
    // Always 200 so Telegram doesn't retry the same update forever.
    return json({ ok: true });
  }

  if (!safeEqual(req.headers.get('x-internal-key'), cfg.internal_key)) {
    return json({ error: 'unauthorized' }, 401);
  }
  try {
    return await handleInternal(await req.json(), cfg);
  } catch (e) {
    console.error('[telegram-bot] internal error:', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
