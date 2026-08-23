import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from '../_shared/stripe.ts';
import { requireAdminUser } from '../_shared/adminAuth.ts';
import {
  resolveTechStripeAccountId,
  transferTechShareToConnect,
} from '../_shared/connectTransfer.ts';
import { splitJobTotalCents } from '../_shared/revenueSplit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const admin = await requireAdminUser(req);
    if (!admin.ok) return admin.response;

    const { bookingReference } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, mechanic_id, payment_intent_id, payment_status, captured_amount_cents, total_estimate'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.payment_status !== 'captured') {
      return jsonResponse({ error: 'Retry transfer only after payment is captured' }, 400);
    }

    const paymentIntentId = booking.payment_intent_id as string | null;
    if (!paymentIntentId) {
      return jsonResponse({ error: 'Missing payment intent' }, 400);
    }

    const { data: paymentRow } = await supabase
      .from('payments')
      .select(
        'stripe_transfer_id, payout_status, tech_transfer_cents, amount_cents, tech_stripe_account_id'
      )
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    const existingTransferId =
      typeof paymentRow?.stripe_transfer_id === 'string' ? paymentRow.stripe_transfer_id : null;
    if (existingTransferId) {
      return jsonResponse({
        ok: true,
        alreadyTransferred: true,
        transferId: existingTransferId,
        bookingReference: booking.reference_code,
      });
    }

    const payoutLocked = ['instant_paid', 'paid', 'instant_pending', 'standard_pending'].includes(
      paymentRow?.payout_status ?? ''
    );
    if (payoutLocked) {
      return jsonResponse(
        { error: `Payout already in progress or paid (${paymentRow?.payout_status})` },
        400
      );
    }

    const pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');
    if (pi.status !== 'succeeded') {
      return jsonResponse({ error: `Stripe PI status is ${pi.status}, expected succeeded` }, 400);
    }

    const capturedCents =
      booking.captured_amount_cents ??
      paymentRow?.amount_cents ??
      pi.amount_received ??
      pi.amount;
    const chargeId =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;

    const techStripeAccountId = await resolveTechStripeAccountId(supabase, booking.mechanic_id);
    const transferResult = await transferTechShareToConnect({
      paymentIntentId,
      bookingReference: booking.reference_code,
      capturedCents: capturedCents as number,
      techStripeAccountId,
      chargeId,
      source: 'admin_retry_transfer',
      existingTransferId: null,
    });

    await supabase
      .from('payments')
      .update({
        platform_fee_cents: transferResult.platformFeeCents,
        tech_transfer_cents: transferResult.techTransferCents,
        tech_stripe_account_id: transferResult.techStripeAccountId,
        stripe_transfer_id: transferResult.transferId,
        payout_status: transferResult.payoutStatus,
        payout_error: transferResult.transferError,
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntentId},booking_reference.ilike.${booking.reference_code},booking_id.eq.${booking.id}`
      );

    if (transferResult.transferError && !transferResult.transferId) {
      return jsonResponse(
        {
          error: transferResult.transferError,
          bookingReference: booking.reference_code,
          connectAccountId: transferResult.techStripeAccountId,
          ...splitJobTotalCents(capturedCents as number),
        },
        400
      );
    }

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      transferId: transferResult.transferId,
      techPayoutDollars: transferResult.techTransferCents / 100,
      platformFeeDollars: transferResult.platformFeeCents / 100,
      connectAccountId: transferResult.techStripeAccountId,
    });
  } catch (err) {
    console.error('[admin-retry-transfer]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Retry transfer failed' },
      500
    );
  }
});
