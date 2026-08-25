import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  authorizeOrder,
  getOrder,
  authorizationFromOrder,
  isPayPalOk,
} from '../_shared/paypal.ts';

/**
 * Place the card hold after the buyer approves the order in the browser.
 *
 * Stripe did not need this step: the PaymentIntent was authorized as part of
 * confirmation, and a webhook recorded it. PayPal splits the two — the buyer
 * approves an order, then the server authorizes it, and only that second call
 * actually reserves funds.
 *
 * Unlike the Helcim design this replaced, the order id is not attacker-supplied:
 * it was minted server-side in create-booking-with-hold and is looked up against
 * the booking's own record. A caller passing someone else's order id gets a
 * mismatch, not a hold.
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
        'id, reference_code, payment_status, hold_amount_cents, paypal_order_id, paypal_authorization_id'
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
    if (booking.paypal_authorization_id) {
      return jsonResponse({
        ok: true,
        alreadyConfirmed: true,
        bookingReference: booking.reference_code,
        authorizationId: booking.paypal_authorization_id,
      });
    }

    // Authorize. If PayPal already authorized this order (a retry that crossed
    // with a webhook), read the existing authorization back off the order rather
    // than treating the error as fatal.
    let auth;
    try {
      auth = await authorizeOrder({
        orderId: submittedOrderId,
        idempotencyKey: `auth-${booking.id}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/ORDER_ALREADY_AUTHORIZED|ORDER_NOT_APPROVED/i.test(message)) {
        const existing = await getOrder(submittedOrderId).catch(() => null);
        const recovered = existing ? authorizationFromOrder(existing.raw) : null;
        if (!recovered?.authorizationId) {
          return jsonResponse(
            { error: `Card was not approved by the customer yet (${message}).` },
            400
          );
        }
        auth = recovered;
      } else {
        return jsonResponse({ error: `Could not place the card hold: ${message}` }, 400);
      }
    }

    if (!isPayPalOk(auth.status)) {
      return jsonResponse(
        { error: `Card was not authorized (PayPal status: ${auth.status}).` },
        400
      );
    }

    // The hold must cover what was quoted. A short authorization leaves the
    // diagnostic underfunded and is treated as a failed hold, not accepted.
    const expectedCents = Number(booking.hold_amount_cents ?? 0);
    if (expectedCents > 0 && auth.amountCents > 0 && auth.amountCents < expectedCents) {
      return jsonResponse(
        {
          error: `Authorized amount ($${(auth.amountCents / 100).toFixed(2)}) is less than the required hold ($${(expectedCents / 100).toFixed(2)}).`,
        },
        400
      );
    }

    const now = new Date().toISOString();

    await supabase
      .from('bookings')
      .update({
        processor: 'paypal',
        paypal_authorization_id: auth.authorizationId,
        paypal_vault_id: auth.vaultId,
        paypal_authorization_expires_at: auth.expirationTime,
        payment_status: 'authorized',
        updated_at: now,
      })
      .eq('id', booking.id);

    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        processor: 'paypal',
        paypal_authorization_id: auth.authorizationId,
        // Without this the remainder above the hold cannot be charged.
        paypal_vault_id: auth.vaultId,
        status: 'authorized',
        payout_status: 'awaiting_capture',
        updated_at: now,
      })
      .eq('booking_id', booking.id);

    if (paymentError) {
      console.error('[confirm-booking-hold] payments update:', paymentError.message);
    }

    if (!auth.vaultId) {
      // Not fatal — the hold is valid and the diagnostic can be captured. But the
      // remainder path will fail later, so make it visible now rather than at the
      // roadside when the tech tries to charge for the repair.
      console.warn(
        `[confirm-booking-hold] no vault id for ${booking.reference_code}; a repair above the hold will need the card re-collected.`
      );
    }

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      authorizationId: auth.authorizationId,
      authorizedAmountDollars: auth.amountCents / 100,
      cardOnFile: Boolean(auth.vaultId),
      // Funds stop being guaranteed here (~3 days out).
      authorizationExpiresAt: auth.expirationTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not confirm the card hold';
    console.error('[confirm-booking-hold]', message);
    return jsonResponse({ error: message }, 500);
  }
});
