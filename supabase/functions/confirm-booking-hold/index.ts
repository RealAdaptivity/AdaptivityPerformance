import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, captureOrder, getOrder, isPayPalOk } from '../_shared/paypal.ts';

/**
 * Collect the diagnostic deposit after the buyer approves the order.
 *
 * PayPal splits approval from settlement: approving an order in the browser
 * moves no money, and only this server-side capture does.
 *
 * The order id is not attacker-supplied — it was minted server-side in
 * create-booking-with-hold and is matched against the booking's own record, so a
 * caller passing someone else's order gets a mismatch rather than a payment
 * applied to their booking.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { bookingReference, orderId } = await req.json();

    if (typeof bookingReference !== 'string' || !bookingReference.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return jsonResponse({ error: 'orderId is required' }, 400);
    }

    const reference = bookingReference.trim();
    const submittedOrderId = orderId.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, payment_status, hold_amount_cents, paypal_order_id, paypal_capture_id'
      )
      .eq('reference_code', reference)
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    // The order must be the one we opened for this booking. This is the check
    // that makes a caller-supplied id harmless.
    if (booking.paypal_order_id !== submittedOrderId) {
      return jsonResponse({ error: 'That order does not belong to this booking.' }, 409);
    }

    // Idempotent: the browser may retry, and a webhook backstop may land first.
    if (booking.paypal_capture_id) {
      return jsonResponse({
        ok: true,
        alreadyConfirmed: true,
        bookingReference: booking.reference_code,
        captureId: booking.paypal_capture_id,
      });
    }

    // Capture. A retry that crossed with a webhook will find the order already
    // captured; read the capture back rather than treating that as a failure.
    let capture;
    try {
      capture = await captureOrder({
        orderId: submittedOrderId,
        idempotencyKey: `dep-cap-${booking.id}`.slice(0, 38),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/ORDER_ALREADY_CAPTURED/i.test(message)) {
        const existing = await getOrder(submittedOrderId).catch(() => null);
        const units = existing?.raw?.purchase_units;
        const unit = Array.isArray(units) ? (units[0] as Record<string, unknown>) : null;
        const payments = unit?.payments as Record<string, unknown> | undefined;
        const captures = payments?.captures;
        const first = Array.isArray(captures) ? (captures[0] as Record<string, unknown>) : null;
        if (!first?.id) {
          return jsonResponse({ error: `Deposit could not be confirmed: ${message}` }, 400);
        }
        capture = {
          captureId: String(first.id),
          status: String(first.status ?? 'COMPLETED'),
          amountCents: Math.round(
            Number((first.amount as Record<string, unknown> | undefined)?.value ?? 0) * 100
          ),
          raw: first,
        };
      } else if (/ORDER_NOT_APPROVED/i.test(message)) {
        return jsonResponse({ error: 'The card was not approved by the customer yet.' }, 400);
      } else {
        return jsonResponse({ error: `Could not collect the deposit: ${message}` }, 400);
      }
    }

    if (!isPayPalOk(capture.status)) {
      return jsonResponse(
        { error: `Deposit was not collected (PayPal status: ${capture.status}).` },
        400
      );
    }

    // The deposit must cover what was quoted. Taking less would leave the
    // diagnostic underfunded, and is treated as a failed booking rather than
    // quietly accepted.
    const expectedCents = Number(booking.hold_amount_cents ?? 0);
    const paidCents = capture.amountCents;
    if (expectedCents > 0 && paidCents > 0 && paidCents < expectedCents) {
      return jsonResponse(
        {
          error: `Amount paid ($${(paidCents / 100).toFixed(2)}) is less than the required deposit ($${(expectedCents / 100).toFixed(2)}).`,
        },
        400
      );
    }

    const now = new Date().toISOString();

    await supabase
      .from('bookings')
      .update({
        processor: 'paypal',
        paypal_capture_id: capture.captureId,
        // Money is collected, not reserved. 'authorized' would be a lie the
        // receipt renders as "Authorized hold".
        payment_status: 'deposit_paid',
        captured_amount_cents: paidCents,
        updated_at: now,
      })
      .eq('id', booking.id);

    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        processor: 'paypal',
        paypal_capture_id: capture.captureId,
        amount_cents: paidCents,
        status: 'deposit_paid',
        payout_status: 'awaiting_job',
        updated_at: now,
      })
      .eq('booking_id', booking.id);

    if (paymentError) {
      console.error('[confirm-booking-hold] payments update:', paymentError.message);
    }

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      captureId: capture.captureId,
      depositPaidDollars: paidCents / 100,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not collect the deposit';
    console.error('[confirm-booking-hold]', message);
    return jsonResponse({ error: message }, 500);
  }
});
