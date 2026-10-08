import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { listSquarePayments, squareConfig } from '../_shared/square.ts';
import { openSquareSales } from '../_shared/squareWebhook.ts';

/**
 * square-open-sales — the card sales rung up in the Square app in the last 12
 * hours that are not on a job yet, for a tech who charged the customer in
 * Square directly. The tech picks one and record-square-payment checks it
 * with Square and closes the job with it, card brand and last 4 included.
 *
 * Body: { bookingId }. Only the tech on that job, or an admin.
 */

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const cfg = squareConfig();
    if (!cfg) return jsonResponse({ error: 'Card payments are not set up yet — ask dispatch.' }, 503);

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    if (!bookingId) return jsonResponse({ error: 'bookingId is required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: profile }, { data: booking }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('bookings').select('id, mechanic_id').eq('id', bookingId).maybeSingle(),
    ]);
    if (!booking) return jsonResponse({ error: 'Job not found' }, 404);
    if (!(profile?.role === 'admin' || (profile?.role === 'tech' && booking.mechanic_id === user.id))) {
      return jsonResponse({ error: 'Only the tech on this job can look up its Square sale' }, 403);
    }

    const now = Date.now();
    const payments = await listSquarePayments(cfg, new Date(now - 12 * 60 * 60 * 1000).toISOString());
    const ids = payments.map((p) => p.id);
    const { data: used } = ids.length
      ? await admin.from('job_payments').select('square_payment_id').in('square_payment_id', ids)
      : { data: [] };
    const attachedIds = new Set((used ?? []).map((u) => u.square_payment_id as string));

    return jsonResponse({ sales: openSquareSales(payments, { locationId: cfg.locationId, attachedIds, now }) });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Could not list Square sales' }, 500);
  }
});
