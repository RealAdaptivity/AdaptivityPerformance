import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
import { sendTwilioSms } from '../_shared/twilioSms.ts';

const GENERIC_MESSAGE =
  'If that phone number matches a recent booking, we sent its tracking ID by text.';

function digitsOnly(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { phone } = await req.json();
    const digits = digitsOnly(phone);
    if (digits.length !== 10) return jsonResponse({ error: 'Enter a valid 10-digit phone number.' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown')
      .split(',')[0]
      .trim();
    const [phoneHash, ipHash] = await Promise.all([sha256(digits), sha256(ip)]);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: phoneAttempts }, { count: ipAttempts }] = await Promise.all([
      supabase.from('tracking_recovery_attempts').select('id', { count: 'exact', head: true }).eq('phone_hash', phoneHash).gte('created_at', since),
      supabase.from('tracking_recovery_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since),
    ]);

    if ((phoneAttempts ?? 0) >= 3 || (ipAttempts ?? 0) >= 10) {
      return jsonResponse({ message: GENERIC_MESSAGE });
    }
    await supabase.from('tracking_recovery_attempts').insert({ phone_hash: phoneHash, ip_hash: ipHash });

    const { data: bookings } = await supabase
      .from('bookings')
      .select('reference_code, status, created_at')
      .eq('customer_phone_digits', digits)
      .order('created_at', { ascending: false })
      .limit(3);
    const matches = bookings ?? [];

    if (matches.length > 0) {
      const refs = matches.map((row) => `${row.reference_code} (${String(row.status).replaceAll('_', ' ')})`).join(', ');
      const result = await sendTwilioSms(
        `+1${digits}`,
        `Adaptivity Performance tracking ID${matches.length > 1 ? 's' : ''}: ${refs}. Track at https://adaptivityperformance.com/`
      );
      if (result.error) console.error('[recover-booking-reference] SMS:', result.error);
    }

    return jsonResponse({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('[recover-booking-reference]', error);
    return jsonResponse({ message: GENERIC_MESSAGE });
  }
});
