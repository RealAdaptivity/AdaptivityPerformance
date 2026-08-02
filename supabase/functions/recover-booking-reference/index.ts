import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
const GENERIC_MESSAGE = 'No matching booking was found. Check the email and phone used at checkout.';

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
    const { phone, email } = await req.json();
    const digits = digitsOnly(phone);
    if (digits.length !== 10) return jsonResponse({ error: 'Enter a valid 10-digit phone number.' }, 400);
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse({ error: 'Enter the email address used at checkout.' }, 400);
    }

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
      return jsonResponse({ message: GENERIC_MESSAGE, references: [] });
    }
    await supabase.from('tracking_recovery_attempts').insert({ phone_hash: phoneHash, ip_hash: ipHash });

    const { data: paymentRows } = await supabase
      .from('payments')
      .select('booking_reference')
      .ilike('customer_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(10);
    const paidRefs = (paymentRows ?? []).map((row) => row.booking_reference).filter(Boolean);
    if (paidRefs.length === 0) return jsonResponse({ message: GENERIC_MESSAGE, references: [] });

    const { data: bookings } = await supabase
      .from('bookings')
      .select('reference_code, status, created_at')
      .eq('customer_phone_digits', digits)
      .in('reference_code', paidRefs)
      .order('created_at', { ascending: false })
      .limit(3);
    const matches = bookings ?? [];
    if (matches.length === 0) return jsonResponse({ message: GENERIC_MESSAGE, references: [] });
    return jsonResponse({
      message: 'We found your tracking ID. Select it to open live tracking.',
      references: matches.map((row) => ({ referenceCode: row.reference_code, status: row.status })),
    });
  } catch (error) {
    console.error('[recover-booking-reference]', error);
    return jsonResponse({ message: GENERIC_MESSAGE, references: [] });
  }
});
