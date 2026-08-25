import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  getHelcimTransaction,
  isHelcimApproved,
  amountToCents,
} from '../_shared/helcim.ts';

/**
 * Record the card hold after the customer completes the HelcimPay.js modal.
 *
 * Stripe did not need this step: the PaymentIntent existed before the customer
 * paid, so a webhook flipping it to requires_capture was enough. HelcimPay.js
 * mints the transaction in the browser, so the id and the vaulted card token
 * only reach us afterwards.
 *
 * That makes this endpoint the security boundary. The browser tells us a
 * transaction id, and a caller can put any string there — including a real
 * transaction belonging to somebody else's booking. So nothing in the request
 * body is trusted: the transaction is re-fetched from Helcim and checked
 * server-side for approval, amount, and prior use before any hold is recorded.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { bookingReference, transactionId } = await req.json();

    if (typeof bookingReference !== 'string' || !bookingReference.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }
    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      return jsonResponse({ error: 'transactionId is required' }, 400);
    }

    const reference = bookingReference.trim();
    const txnId = transactionId.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, payment_status, hold_amount_cents, helcim_transaction_id')
      .eq('reference_code', reference)
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    // Idempotent: the browser may retry, and the webhook backstop may land first.
    if (booking.helcim_transaction_id) {
      if (booking.helcim_transaction_id === txnId) {
        return jsonResponse({
          ok: true,
          alreadyConfirmed: true,
          bookingReference: booking.reference_code,
        });
      }
      // A different transaction is already on this booking. Never overwrite —
      // that would orphan a real hold on the customer's card.
      return jsonResponse(
        { error: 'This booking already has a card hold recorded.' },
        409
      );
    }

    // Refuse a transaction already attached to another booking, which is what an
    // attacker replaying someone else's id would look like.
    const { data: claimed } = await supabase
      .from('payments')
      .select('booking_id')
      .eq('helcim_transaction_id', txnId)
      .maybeSingle();
    if (claimed && claimed.booking_id !== booking.id) {
      return jsonResponse({ error: 'That transaction belongs to another booking.' }, 409);
    }

    // Source of truth: Helcim, not the request body.
    let txn;
    try {
      txn = await getHelcimTransaction(txnId);
    } catch {
      return jsonResponse({ error: 'Could not verify that transaction with Helcim.' }, 502);
    }

    if (!isHelcimApproved(txn.status)) {
      return jsonResponse(
        { error: `Card was not authorized (Helcim status: ${txn.status}).` },
        400
      );
    }

    // The hold must cover what we quoted. A short authorization would leave the
    // diagnostic underfunded and is treated as a failed hold rather than
    // silently accepted.
    const expectedCents = Number(booking.hold_amount_cents ?? 0);
    const authorizedCents = amountToCents(txn.amount);
    if (expectedCents > 0 && authorizedCents < expectedCents) {
      return jsonResponse(
        {
          error: `Authorized amount ($${(authorizedCents / 100).toFixed(2)}) is less than the required hold ($${(expectedCents / 100).toFixed(2)}).`,
        },
        400
      );
    }

    const now = new Date().toISOString();

    await supabase
      .from('bookings')
      .update({
        processor: 'helcim',
        helcim_transaction_id: txn.transactionId,
        helcim_card_token: txn.cardToken,
        payment_status: 'authorized',
        updated_at: now,
      })
      .eq('id', booking.id);

    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        processor: 'helcim',
        helcim_transaction_id: txn.transactionId,
        // Without this token a repair above the hold cannot be charged on site.
        helcim_card_token: txn.cardToken,
        helcim_customer_code: txn.customerCode,
        status: 'authorized',
        payout_status: 'awaiting_capture',
        updated_at: now,
      })
      .eq('booking_id', booking.id);

    if (paymentError) {
      console.error('[confirm-booking-hold] payments update:', paymentError.message);
    }

    if (!txn.cardToken) {
      // Not fatal — the hold is valid and the diagnostic can be captured. But the
      // remainder path will fail later, so make it visible now rather than at the
      // roadside when the tech tries to charge for the repair.
      console.warn(
        `[confirm-booking-hold] no cardToken returned for ${booking.reference_code}; remainder charges will require re-collecting the card.`
      );
    }

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      transactionId: txn.transactionId,
      authorizedAmountDollars: authorizedCents / 100,
      cardOnFile: Boolean(txn.cardToken),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not confirm the card hold';
    console.error('[confirm-booking-hold]', message);
    return jsonResponse({ error: message }, 500);
  }
});
