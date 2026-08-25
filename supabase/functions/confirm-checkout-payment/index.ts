import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  captureOrder,
  getOrder,
  isPayPalOk,
} from '../_shared/paypal.ts';

/**
 * Capture a checkout the buyer approved (payment link or in-app final payment).
 *
 * The counterpart to confirm-booking-hold. As there, the order id was minted
 * server-side and is matched against our own payments row, so a caller cannot
 * present someone else's order and have it applied to their booking.
 *
 * Approving an order in the browser moves no money — this call does.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { orderId } = await req.json();
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return jsonResponse({ error: 'orderId is required' }, 400);
    }
    const submittedOrderId = orderId.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(
        'id, booking_id, booking_reference, amount_cents, tech_transfer_cents, status, paypal_capture_id'
      )
      .eq('paypal_order_id', submittedOrderId)
      .maybeSingle();

    if (paymentError || !payment) {
      return jsonResponse({ error: 'Unknown checkout order' }, 404);
    }

    // Idempotent: the browser may retry, and a webhook backstop may arrive first.
    if (payment.paypal_capture_id) {
      return jsonResponse({
        ok: true,
        alreadyConfirmed: true,
        bookingReference: payment.booking_reference,
        captureId: payment.paypal_capture_id,
      });
    }

    let capture;
    try {
      capture = await captureOrder({
        orderId: submittedOrderId,
        idempotencyKey: `cap-order-${payment.id}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A retry that crossed with a webhook: the order is already captured, so
      // read the capture back rather than treating it as a failure.
      if (/ORDER_ALREADY_CAPTURED/i.test(message)) {
        const existing = await getOrder(submittedOrderId).catch(() => null);
        const units = existing?.raw?.purchase_units;
        const unit = Array.isArray(units) ? (units[0] as Record<string, unknown>) : null;
        const payments = unit?.payments as Record<string, unknown> | undefined;
        const captures = payments?.captures;
        const first = Array.isArray(captures) ? (captures[0] as Record<string, unknown>) : null;
        if (!first?.id) {
          return jsonResponse({ error: `Payment could not be confirmed: ${message}` }, 400);
        }
        capture = {
          captureId: String(first.id),
          status: String(first.status ?? 'COMPLETED'),
          amountCents: Math.round(
            Number((first.amount as Record<string, unknown> | undefined)?.value ?? 0) * 100
          ),
          raw: first,
        };
      } else {
        return jsonResponse({ error: `Payment could not be completed: ${message}` }, 400);
      }
    }

    if (!isPayPalOk(capture.status)) {
      return jsonResponse({ error: `Payment was not approved (PayPal status: ${capture.status}).` }, 400);
    }

    const expectedCents = Number(payment.amount_cents ?? 0);
    const paidCents = capture.amountCents;
    if (expectedCents > 0 && paidCents > 0 && paidCents < expectedCents) {
      return jsonResponse(
        {
          error: `Amount paid ($${(paidCents / 100).toFixed(2)}) is less than the amount due ($${(expectedCents / 100).toFixed(2)}).`,
        },
        400
      );
    }

    const now = new Date().toISOString();

    // Accrue the tech's share. Unlike the capture path this is a standalone
    // payment, so the mechanic comes off the booking rather than the caller.
    let payoutError: string | null = null;
    let mechanicId: string | null = null;
    if (payment.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('mechanic_id')
        .eq('id', payment.booking_id)
        .maybeSingle();
      mechanicId = (booking?.mechanic_id as string) ?? null;
    }

    const techCents = Number(payment.tech_transfer_cents ?? 0);
    if (mechanicId && techCents > 0) {
      const { error } = await supabase.from('tech_payouts').upsert(
        {
          booking_id: payment.booking_id,
          booking_reference: payment.booking_reference ?? '',
          mechanic_id: mechanicId,
          amount_cents: techCents,
          status: 'accrued',
          notes: 'Checkout / payment link',
        },
        { onConflict: 'booking_id' }
      );
      if (error) {
        // The customer has paid; never fail the confirmation over the ledger.
        payoutError = error.message;
        console.error('[confirm-checkout-payment] tech_payouts upsert failed', error.message);
      }
    } else if (!mechanicId) {
      payoutError = 'No technician assigned; nothing accrued.';
    }

    await supabase
      .from('payments')
      .update({
        processor: 'paypal',
        paypal_capture_id: capture.captureId,
        status: 'succeeded',
        payout_status: payoutError ? 'none' : 'accrued',
        payout_error: payoutError,
        updated_at: now,
      })
      .eq('id', payment.id);

    if (payment.booking_id) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'captured', captured_amount_cents: paidCents, updated_at: now })
        .eq('id', payment.booking_id);
    }

    return jsonResponse({
      ok: true,
      bookingReference: payment.booking_reference,
      captureId: capture.captureId,
      paidAmountDollars: paidCents / 100,
      payoutWarning: payoutError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not confirm the payment';
    console.error('[confirm-checkout-payment]', message);
    return jsonResponse({ error: message }, 500);
  }
});
