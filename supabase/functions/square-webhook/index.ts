import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  completedRefundCents,
  jobReferenceForPayment,
  paymentStatusAfterRefunds,
  verifySquareSignature,
  type SquarePaymentLike,
  type SquareRefundLike,
} from '../_shared/squareWebhook.ts';

/**
 * square-webhook — Square tells the website about card payments and refunds.
 *
 * Subscribe in the Square Developer Console (Webhooks) to payment.created,
 * payment.updated, refund.created and refund.updated, with this function's
 * URL as the notification URL, and set its signature key as the
 * SQUARE_WEBHOOK_SIGNATURE_KEY secret. Deliveries without a valid signature
 * are refused.
 *
 * - A completed card payment that names one of our jobs (reference_id, or
 *   "Job AP-…" in its note) and matches the total of that job's close-out is
 *   attached to it, if the tech closed the job without one ("paid in person").
 *   That is what gives those jobs their card brand and last 4.
 * - A refund is recorded and summed onto the job, and the booking reads
 *   refunded or partially refunded.
 *
 * Every step is idempotent, so Square's retries are harmless; deliveries are
 * also logged by event id with what was done.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Admin = ReturnType<typeof createClient>;

async function handlePayment(admin: Admin, p: SquarePaymentLike, locationId: string): Promise<string> {
  if (p.status !== 'COMPLETED') return `payment ${String(p.status ?? 'unknown').toLowerCase()}`;
  if (locationId && p.location_id !== locationId) return 'other Square location';
  const card = p.card_details?.card;

  const { data: attached } = await admin
    .from('job_payments')
    .select('booking_id, card_last4')
    .eq('square_payment_id', p.id)
    .maybeSingle();
  if (attached) {
    if (!attached.card_last4 && card?.last_4) {
      await admin
        .from('job_payments')
        .update({ card_brand: card.card_brand ?? null, card_last4: card.last_4 })
        .eq('booking_id', attached.booking_id);
      return 'card details filled in';
    }
    return 'already on its job';
  }

  const ref = jobReferenceForPayment(p);
  if (!ref) return 'no job reference on the payment';
  const { data: booking } = await admin.from('bookings').select('id').eq('reference_code', ref).maybeSingle();
  if (!booking) return `no job ${ref}`;
  const { data: jp } = await admin
    .from('job_payments')
    .select('booking_id, total_cents, payment_method, square_payment_id')
    .eq('booking_id', booking.id)
    .maybeSingle();
  if (!jp) return `${ref} not closed yet`;
  if (jp.square_payment_id) return `${ref} already has a card payment`;
  if (jp.payment_method !== 'in_person') return `${ref} was recorded as ${jp.payment_method}; left as is`;
  if (p.amount_money?.currency !== 'USD' || p.amount_money?.amount !== jp.total_cents) {
    return `${ref} total differs from the card payment; left as is`;
  }
  const { error } = await admin
    .from('job_payments')
    .update({
      payment_method: 'card',
      square_payment_id: p.id,
      square_location_id: p.location_id ?? null,
      card_brand: card?.card_brand ?? null,
      card_last4: card?.last_4 ?? null,
    })
    .eq('booking_id', booking.id)
    .is('square_payment_id', null);
  if (error) throw new Error(`attach ${ref}: ${error.message}`);
  return `attached to ${ref}`;
}

async function handleRefund(admin: Admin, r: SquareRefundLike): Promise<string> {
  if (!r.id || !r.payment_id) return 'refund without a payment';
  const { data: jp } = await admin
    .from('job_payments')
    .select('booking_id, total_cents')
    .eq('square_payment_id', r.payment_id)
    .maybeSingle();

  const { error: upsertError } = await admin.from('square_refunds').upsert({
    id: r.id,
    payment_id: r.payment_id,
    booking_id: jp?.booking_id ?? null,
    amount_cents: Math.max(0, Math.round(r.amount_money?.amount ?? 0)),
    status: String(r.status ?? 'PENDING'),
    reason: r.reason?.slice(0, 500) ?? null,
    square_created_at: r.created_at ?? null,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) throw new Error(`save refund: ${upsertError.message}`);
  if (!jp) return 'refund for a payment that is not on a job';

  const { data: refunds } = await admin
    .from('square_refunds')
    .select('id, status, amount_cents')
    .eq('payment_id', r.payment_id);
  const refunded = Math.min(jp.total_cents, completedRefundCents((refunds ?? []) as { id: string; status: string; amount_cents: number }[]));
  const { error } = await admin
    .from('job_payments')
    .update({ refunded_cents: refunded, refunded_at: refunded > 0 ? new Date().toISOString() : null })
    .eq('booking_id', jp.booking_id);
  if (error) throw new Error(`update refund total: ${error.message}`);
  await admin
    .from('bookings')
    .update({ payment_status: paymentStatusAfterRefunds(jp.total_cents, refunded) })
    .eq('id', jp.booking_id);
  return `refunded ${refunded} of ${jp.total_cents}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')?.trim() ?? '';
  if (!signatureKey) return json({ error: 'Square webhooks are not set up yet' }, 503);
  const notificationUrl =
    Deno.env.get('SQUARE_WEBHOOK_URL')?.trim() || `${Deno.env.get('SUPABASE_URL')}/functions/v1/square-webhook`;

  const raw = await req.text();
  const ok = await verifySquareSignature(signatureKey, notificationUrl, raw, req.headers.get('x-square-hmacsha256-signature'));
  if (!ok) return json({ error: 'Bad signature' }, 401);

  let event: { event_id?: string; type?: string; data?: { id?: string; object?: { payment?: SquarePaymentLike; refund?: SquareRefundLike } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  const eventId = String(event.event_id ?? '');
  const type = String(event.type ?? '');
  if (!eventId) return json({ error: 'No event id' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: seen } = await admin.from('square_webhook_events').select('event_id').eq('event_id', eventId).maybeSingle();
  if (seen) return json({ ok: true, duplicate: true });

  try {
    let outcome = 'ignored';
    const object = event.data?.object ?? {};
    if ((type === 'payment.created' || type === 'payment.updated') && object.payment) {
      outcome = await handlePayment(admin, object.payment, Deno.env.get('SQUARE_LOCATION_ID')?.trim() ?? '');
    } else if ((type === 'refund.created' || type === 'refund.updated') && object.refund) {
      outcome = await handleRefund(admin, object.refund);
    }
    await admin
      .from('square_webhook_events')
      .upsert({ event_id: eventId, type, object_id: event.data?.id ?? null, outcome: outcome.slice(0, 300) });
    return json({ ok: true, outcome });
  } catch (e) {
    // A 500 makes Square retry the delivery later.
    console.error('[square-webhook]', type, e instanceof Error ? e.message : e);
    return json({ error: 'Could not apply the event' }, 500);
  }
});
