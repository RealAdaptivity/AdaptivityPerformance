import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/helcim.ts';
import { cancelBookingHoldForRow } from '../_shared/cancelHold.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('CLEANUP_CRON_SECRET')?.trim();
  const supplied = req.headers.get('x-cron-secret')?.trim();
  if (!expected || !supplied || supplied !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('id, reference_code, helcim_transaction_id, payment_status')
    .lte('hold_expires_at', new Date().toISOString())
    .in('payment_status', ['awaiting_card', 'authorized', 'requires_capture', 'hold'])
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED')
    .order('hold_expires_at', { ascending: true })
    .limit(50);
  if (error) return jsonResponse({ error: error.message }, 500);

  const released: string[] = [];
  const failures: Array<{ reference: string; error: string }> = [];
  for (const booking of rows ?? []) {
    try {
      await cancelBookingHoldForRow(supabase, booking, { releaseJob: true });
      released.push(booking.reference_code);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown cleanup error';
      // Safety net for a hold Helcim no longer recognises. cancelBookingHoldForRow
      // already treats a missing transaction as released, so this only catches
      // wordings it did not match -- there is nothing left to reverse either way,
      // and leaving the booking pending forever helps nobody.
      if (/no such|resource_missing|not found/i.test(message)) {
        await supabase.from('bookings').update({ payment_status: 'canceled', status: 'CANCELED', mechanic_id: null, eta_minutes: 0, distance_miles: 0, updated_at: new Date().toISOString() }).eq('id', booking.id);
        await supabase.from('payments').update({ status: 'canceled', payout_error: 'Expired orphaned hold: processor no longer has this transaction', updated_at: new Date().toISOString() }).eq('booking_id', booking.id);
        released.push(booking.reference_code);
        continue;
      }
      failures.push({ reference: booking.reference_code, error: message });
    }
  }
  return jsonResponse({ ok: failures.length === 0, scanned: rows?.length ?? 0, released, failures });
});
