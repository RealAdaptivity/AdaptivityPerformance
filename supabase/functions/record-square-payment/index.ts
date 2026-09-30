import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { getSquarePayment, paymentIdForSquareOrder, squareConfig } from '../_shared/square.ts';
import { computeCloseOut, formatCents, type PartsBy, type TaxMode } from '../_shared/closeOut.ts';

/**
 * record-square-payment — closes a job the customer paid by card, either with
 * Tap to Pay in the tech app or in the Square Point of Sale app from the web
 * tech portal.
 *
 * Body: { bookingId, squarePaymentId | squareOrderId, payment } where
 * `payment` is exactly what the app would send to record_job_payment.
 * squareOrderId is the transaction id Square Point of Sale returns; the
 * payment is found through the order.
 *
 * Point of Sale can't tag a payment with our job reference, so for those the
 * reference check is replaced by: taken in the last 12 hours, and (like every
 * card payment) never used to close another job.
 *
 * The job only closes once Square confirms the payment is COMPLETED, at our
 * location, carries this job's reference, and is for exactly the total the
 * close-out adds up to. Then record_job_payment runs as the tech (so its own
 * checks — right tech, customer signature, open job — still apply) and the
 * card details are attached to the row it wrote.
 *
 * Safe to retry with the same payment id: if the job was already closed by
 * this payment the call succeeds again; if closing failed after the card was
 * charged, retrying finishes it.
 */

type LineIn = { title?: string; labor_cents?: number; parts_cents?: number };

const cents = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
const dollars = (c: number) => (c / 100).toFixed(2);

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

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
    const squareOrderId = typeof body.squareOrderId === 'string' ? body.squareOrderId.trim() : '';
    const fromPointOfSale = Boolean(squareOrderId);
    const payment = body.payment && typeof body.payment === 'object' ? body.payment : null;
    let squarePaymentId = typeof body.squarePaymentId === 'string' ? body.squarePaymentId.trim() : '';
    if (!bookingId || !(squarePaymentId || squareOrderId) || !payment) {
      return jsonResponse({ error: 'bookingId, squarePaymentId (or squareOrderId) and payment are required' }, 400);
    }
    if (payment.kind !== 'charge' && payment.kind !== 'diagnostic_only') {
      return jsonResponse({ error: 'Only a repair or diagnostic can be paid by card' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: profile }, { data: booking }, { data: existing }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('bookings').select('id, reference_code, mechanic_id, status').eq('id', bookingId).maybeSingle(),
      admin
        .from('job_payments')
        .select('booking_id, square_payment_id, total_cents, tech_payout_cents, tax_cents')
        .eq('booking_id', bookingId)
        .maybeSingle(),
    ]);
    if (!booking) return jsonResponse({ error: 'Job not found' }, 404);
    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && !(profile?.role === 'tech' && booking.mechanic_id === user.id)) {
      return jsonResponse({ error: 'Only the tech on this job can close it' }, 403);
    }

    // Point of Sale returns the sale (order); the card payment hangs off it.
    if (fromPointOfSale) squarePaymentId = await paymentIdForSquareOrder(cfg, squareOrderId);

    // Retry after success: nothing more to do.
    if (existing) {
      if (existing.square_payment_id === squarePaymentId) {
        return jsonResponse({
          totalCents: existing.total_cents,
          taxCents: existing.tax_cents,
          techPayoutCents: existing.tech_payout_cents,
          alreadyRecorded: true,
        });
      }
      return jsonResponse(
        {
          error: `This job was already closed. The card payment (Square ${squarePaymentId}) was not attached to it — refund it in Square if it should not stand.`,
        },
        409
      );
    }

    // What the close-out adds up to, with the same sums record_job_payment uses.
    const lines: LineIn[] = Array.isArray(payment.line_items) ? payment.line_items.slice(0, 20) : [];
    const taxMode: TaxMode = ['parts', 'total', 'none'].includes(payment.tax_mode) ? payment.tax_mode : 'parts';
    const partsBy: PartsBy = payment.parts_by === 'company' ? 'company' : 'tech';
    const expected = computeCloseOut({
      kind: payment.kind,
      lines: lines.map((l) => ({
        title: String(l.title ?? ''),
        labor: dollars(cents(l.labor_cents)),
        parts: dollars(cents(l.parts_cents)),
      })),
      diagnosticCents: cents(payment.diagnostic_cents),
      travelCents: cents(payment.travel_cents),
      taxMode,
      partsBy,
    });

    const { data: usedElsewhere } = await admin
      .from('job_payments')
      .select('booking_id')
      .eq('square_payment_id', squarePaymentId)
      .neq('booking_id', bookingId)
      .maybeSingle();
    if (usedElsewhere) {
      return jsonResponse({ error: `Job not closed: that Square payment already closed another job. Square payment ${squarePaymentId}.` }, 409);
    }

    const sq = await getSquarePayment(cfg, squarePaymentId);
    const tooOld = !sq.created_at || Date.now() - Date.parse(sq.created_at) > 12 * 60 * 60 * 1000;
    const wrongJob = (sq.reference_id ?? '').trim().toUpperCase() !== String(booking.reference_code).trim().toUpperCase();
    const problem =
      sq.status !== 'COMPLETED'
        ? `the card payment is ${sq.status.toLowerCase()}, not completed`
        : sq.location_id !== cfg.locationId
          ? 'the card payment was taken at a different Square location'
          : fromPointOfSale && tooOld
            ? 'the Square sale is more than 12 hours old'
            : !fromPointOfSale && wrongJob
              ? 'the card payment is for a different job'
              : sq.amount_money?.currency !== 'USD' || sq.amount_money?.amount !== expected.totalCents
                ? `the card was charged ${formatCents(sq.amount_money?.amount ?? 0)} but the receipt totals ${formatCents(expected.totalCents)}`
                : null;
    if (problem) {
      return jsonResponse({ error: `Job not closed: ${problem}. Square payment ${squarePaymentId}.` }, 409);
    }

    const { data: saved, error: rpcError } = await userClient.rpc('record_job_payment', {
      p_booking_id: bookingId,
      p_payment: payment,
    });
    if (rpcError) {
      return jsonResponse(
        {
          error: `The card was charged but the job is not closed yet: ${rpcError.message}. Fix it and try again — the same payment will be used, the card will not be charged twice.`,
        },
        409
      );
    }
    const r = saved as { total_cents: number; tax_cents: number; tech_payout_cents: number };

    const card = sq.card_details?.card;
    const { error: attachError } = await admin
      .from('job_payments')
      .update({
        payment_method: 'card',
        square_payment_id: sq.id,
        square_location_id: sq.location_id,
        card_brand: card?.card_brand ?? null,
        card_last4: card?.last_4 ?? null,
      })
      .eq('booking_id', bookingId);
    if (attachError) console.error('[record-square-payment] attach card details', attachError);

    return jsonResponse({ totalCents: r.total_cents, taxCents: r.tax_cents, techPayoutCents: r.tech_payout_cents });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
