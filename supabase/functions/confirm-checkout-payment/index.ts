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
 * Record a completed checkout (payment link or in-app final payment).
 *
 * The counterpart to confirm-booking-hold, and a security boundary for the same
 * reason: HelcimPay.js mints the transaction in the browser, so the id arrives
 * from a caller who could have supplied anyone's. Nothing in the request body is
 * trusted -- the transaction is re-fetched from Helcim and checked for approval
 * and sufficient amount before the payment is marked paid.
 *
 * The checkout token is the join key. It was minted server-side by
 * create-payment-intent and stored on the payments row, so a caller cannot
 * invent one that resolves to a payment they do not own.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { checkoutToken, transactionId } = await req.json();

    if (typeof checkoutToken !== 'string' || !checkoutToken.trim()) {
      return jsonResponse({ error: 'checkoutToken is required' }, 400);
    }
    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      return jsonResponse({ error: 'transactionId is required' }, 400);
    }

    const token = checkoutToken.trim();
    const txnId = transactionId.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(
        'id, booking_id, booking_reference, amount_cents, tech_transfer_cents, status, helcim_transaction_id'
      )
      .eq('helcim_checkout_token', token)
      .maybeSingle();

    if (paymentError || !payment) {
      return jsonResponse({ error: 'Unknown checkout session' }, 404);
    }

    // Idempotent: the browser may retry, and a webhook backstop may arrive first.
    if (payment.helcim_transaction_id) {
      return jsonResponse({
        ok: true,
        alreadyConfirmed: true,
        bookingReference: payment.booking_reference,
        transactionId: payment.helcim_transaction_id,
      });
    }

    let txn;
    try {
      txn = await getHelcimTransaction(txnId);
    } catch {
      return jsonResponse({ error: 'Could not verify that transaction with Helcim.' }, 502);
    }

    if (!isHelcimApproved(txn.status)) {
      return jsonResponse({ error: `Payment was not approved (Helcim status: ${txn.status}).` }, 400);
    }

    const expectedCents = Number(payment.amount_cents ?? 0);
    const paidCents = amountToCents(txn.amount);
    if (expectedCents > 0 && paidCents < expectedCents) {
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
        processor: 'helcim',
        helcim_transaction_id: txn.transactionId,
        helcim_card_token: txn.cardToken,
        helcim_customer_code: txn.customerCode,
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
      transactionId: txn.transactionId,
      paidAmountDollars: paidCents / 100,
      payoutWarning: payoutError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not confirm the payment';
    console.error('[confirm-checkout-payment]', message);
    return jsonResponse({ error: message }, 500);
  }
});
