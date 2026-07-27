import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';
import { reverseConnectTransfer } from './_shared/connectTransfer.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const admin = await requireAdminUser(req);
    if (!admin.ok) return admin.response;

    const { bookingReference, refundAmountDollars, reason, forceAfterPayout } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, payment_intent_id, payment_status, captured_amount_cents')
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.payment_status !== 'captured' && booking.payment_status !== 'partially_refunded') {
      return jsonResponse({ error: 'Refund only applies after payment is captured' }, 400);
    }

    const paymentIntentId = booking.payment_intent_id as string | null;
    if (!paymentIntentId) {
      return jsonResponse({ error: 'Missing payment intent' }, 400);
    }

    const { data: paymentRow } = await supabase
      .from('payments')
      .select(
        'stripe_transfer_id, stripe_transfer_reversal_id, tech_transfer_cents, amount_cents, payout_status'
      )
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    const pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    if (!chargeId) {
      return jsonResponse({ error: 'No charge found to refund' }, 400);
    }

    const maxCents = booking.captured_amount_cents ?? paymentRow?.amount_cents ?? pi.amount_received ?? pi.amount;
    let refundCents = maxCents as number;
    if (refundAmountDollars !== undefined && refundAmountDollars !== null && refundAmountDollars !== '') {
      refundCents = Math.round(Number(refundAmountDollars) * 100);
      if (!Number.isFinite(refundCents) || refundCents <= 0) {
        return jsonResponse({ error: 'Invalid refundAmountDollars' }, 400);
      }
      if (refundCents > (maxCents as number)) {
        return jsonResponse({ error: 'Refund exceeds captured amount' }, 400);
      }
    }

    let reversal: Awaited<ReturnType<typeof reverseConnectTransfer>> | null = null;
    const transferId =
      typeof paymentRow?.stripe_transfer_id === 'string' ? paymentRow.stripe_transfer_id : null;

    if (transferId && !paymentRow?.stripe_transfer_reversal_id) {
      reversal = await reverseConnectTransfer({
        transferId,
        capturedCents: maxCents as number,
        refundCents,
        techTransferCents: (paymentRow?.tech_transfer_cents as number) ?? 0,
        bookingReference: booking.reference_code,
        forceAfterPayout: forceAfterPayout === true,
        payoutStatus: paymentRow?.payout_status as string | null,
      });

      if (reversal.error && !reversal.reversalId) {
        return jsonResponse(
          {
            error: reversal.error,
            requiresForceAfterPayout: reversal.payoutAlreadyCashedOut,
            transferId,
          },
          409
        );
      }
    }

    const refund = await stripeRequest('/refunds', 'POST', {
      charge: chargeId,
      amount: refundCents,
      reason: reason === 'duplicate' || reason === 'fraudulent' ? reason : 'requested_by_customer',
      metadata: {
        booking_reference: booking.reference_code,
        platform: 'adaptivity_admin',
        transfer_reversal_id: reversal?.reversalId ?? '',
      },
    });

    const fullyRefunded = refundCents >= (maxCents as number);
    const paymentStatus = fullyRefunded ? 'refunded' : 'partially_refunded';
    const payoutStatus = reversal?.reversalId
      ? fullyRefunded
        ? 'reversed'
        : 'partially_reversed'
      : paymentRow?.payout_status ?? 'none';

    await supabase
      .from('bookings')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        stripe_refund_id: refund.id,
        stripe_transfer_reversal_id: reversal?.reversalId ?? paymentRow?.stripe_transfer_reversal_id ?? null,
        payout_status: payoutStatus,
        payout_error: reversal?.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      refundId: refund.id,
      refundAmountDollars: refundCents / 100,
      fullyRefunded,
      transferReversalId: reversal?.reversalId ?? null,
      reversedTechDollars: (reversal?.reversedCents ?? 0) / 100,
      reversalWarning: reversal?.error ?? null,
    });
  } catch (err) {
    console.error('[admin-refund-booking]', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Refund failed' }, 500);
  }
});
