import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';
import {
  resolveTechStripeAccountId,
  transferTechShareToConnect,
} from './_shared/connectTransfer.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      return jsonResponse(
        { error: 'STRIPE_SECRET_KEY is not configured on Supabase Edge Functions.' },
        503
      );
    }

    const admin = await requireAdminUser(req);
    if (!admin.ok) return admin.response;

    const { bookingReference, captureAmountDollars, markCompleted = false } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const captureDollars = Number(captureAmountDollars);
    if (!Number.isFinite(captureDollars) || captureDollars <= 0) {
      return jsonResponse({ error: 'captureAmountDollars must be a positive number' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, payment_intent_id, payment_status, hold_amount_cents, total_estimate, mechanic_id'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const paymentIntentId = booking.payment_intent_id as string | null;
    if (!paymentIntentId) {
      return jsonResponse({ error: 'No payment hold on this booking' }, 400);
    }

    const holdCents =
      booking.hold_amount_cents ?? Math.round(Number(booking.total_estimate) * 100);
    const captureCents = Math.round(captureDollars * 100);
    if (captureCents > holdCents) {
      return jsonResponse({ error: `Capture cannot exceed hold ($${(holdCents / 100).toFixed(2)})` }, 400);
    }

    let pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');

    if (pi.status === 'requires_capture') {
      pi = await stripeRequest(`/payment_intents/${paymentIntentId}/capture`, 'POST', {
        amount_to_capture: captureCents,
      });
    } else if (pi.status === 'succeeded') {
      return jsonResponse({ error: 'Payment already captured. Use refund to adjust.' }, 400);
    } else {
      return jsonResponse({ error: `Cannot capture (Stripe status: ${pi.status})` }, 400);
    }

    const capturedCents = pi.amount_received ?? captureCents;
    const chargeId =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;
    const techStripeAccountId = await resolveTechStripeAccountId(supabase, booking.mechanic_id);

    const { data: paymentRow } = await supabase
      .from('payments')
      .select('stripe_transfer_id')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    const transferResult = await transferTechShareToConnect({
      paymentIntentId,
      bookingReference: booking.reference_code,
      capturedCents,
      techStripeAccountId,
      chargeId,
      source: 'admin_adjust_capture',
      existingTransferId:
        typeof paymentRow?.stripe_transfer_id === 'string' ? paymentRow.stripe_transfer_id : null,
    });

    const bookingPatch: Record<string, unknown> = {
      payment_status: 'captured',
      captured_amount_cents: capturedCents,
      updated_at: new Date().toISOString(),
    };
    if (markCompleted) {
      bookingPatch.status = 'COMPLETED';
    }

    await supabase.from('bookings').update(bookingPatch).eq('id', booking.id);

    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        amount_cents: capturedCents,
        platform_fee_cents: transferResult.platformFeeCents,
        tech_transfer_cents: transferResult.techTransferCents,
        tech_stripe_account_id: transferResult.techStripeAccountId,
        stripe_transfer_id: transferResult.transferId,
        payout_status: transferResult.payoutStatus,
        payout_error: transferResult.transferError,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      capturedAmountDollars: capturedCents / 100,
      techShareDollars: transferResult.techTransferCents / 100,
      platformShareDollars: transferResult.platformFeeCents / 100,
      markCompleted,
      transferId: transferResult.transferId,
      transferWarning: transferResult.transferError,
    });
  } catch (err) {
    console.error('[admin-adjust-capture]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Partial capture failed' },
      500
    );
  }
});
