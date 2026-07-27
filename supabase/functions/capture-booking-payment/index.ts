import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import {
  resolveTechStripeAccountId,
  transferTechShareToConnect,
} from './_shared/connectTransfer.ts';
import { splitJobTotalCents } from './_shared/revenueSplit.ts';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

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
      .select('id, reference_code, mechanic_id, payment_intent_id, payment_status, hold_amount_cents, total_estimate')
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.mechanic_id !== user.id) {
      return jsonResponse({ error: 'Only the assigned technician can complete payment capture' }, 403);
    }

    const paymentIntentId = booking.payment_intent_id;
    if (!paymentIntentId) {
      return jsonResponse({ error: 'No card hold on this booking' }, 400);
    }

    const alreadyCaptured = booking.payment_status === 'captured';

    let pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');

    if (!alreadyCaptured) {
      if (pi.status === 'requires_capture') {
        const captureCents =
          booking.hold_amount_cents ?? Math.round(Number(booking.total_estimate) * 100);
        pi = await stripeRequest(`/payment_intents/${paymentIntentId}/capture`, 'POST', {
          amount_to_capture: captureCents,
        });
      } else if (pi.status !== 'succeeded') {
        return jsonResponse(
          {
            error: `Payment cannot be captured (status: ${pi.status}). Customer must confirm card at booking.`,
          },
          400
        );
      }
    } else if (pi.status !== 'succeeded') {
      return jsonResponse(
        { error: `Payment is marked captured but Stripe status is ${pi.status}. Contact support.` },
        400
      );
    }

    const capturedCents = pi.amount_received ?? pi.amount;
    const chargeId =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;

    const { data: paymentRow } = await supabase
      .from('payments')
      .select('stripe_transfer_id, payout_status')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    const existingTransferId =
      typeof paymentRow?.stripe_transfer_id === 'string' ? paymentRow.stripe_transfer_id : null;
    const payoutLocked = ['instant_paid', 'paid', 'instant_pending', 'standard_pending'].includes(
      paymentRow?.payout_status ?? ''
    );
    const shouldTransfer = !existingTransferId && !payoutLocked;

    const techStripeAccountId = await resolveTechStripeAccountId(supabase, booking.mechanic_id);

    let transferResult = {
      techStripeAccountId,
      techTransferCents: 0,
      platformFeeCents: 0,
      transferId: existingTransferId,
      transferError: null as string | null,
      payoutStatus: paymentRow?.payout_status ?? 'none',
    };

    if (shouldTransfer) {
      transferResult = await transferTechShareToConnect({
        paymentIntentId,
        bookingReference: booking.reference_code,
        capturedCents,
        techStripeAccountId,
        chargeId,
        source: alreadyCaptured ? 'job_capture_retry' : 'job_capture',
        existingTransferId,
      });
    } else if (existingTransferId) {
      const { platformFeeCents, techTransferCents } = splitJobTotalCents(capturedCents);
      transferResult = {
        techStripeAccountId,
        techTransferCents,
        platformFeeCents,
        transferId: existingTransferId,
        transferError: null,
        payoutStatus: 'pending',
      };
    }

    if (!alreadyCaptured) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'captured',
          captured_amount_cents: capturedCents,
          status: 'COMPLETED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
    }

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
      alreadyCaptured,
      bookingReference: booking.reference_code,
      capturedAmountDollars: capturedCents / 100,
      techPayoutDollars: transferResult.techTransferCents / 100,
      platformFeeDollars: transferResult.platformFeeCents / 100,
      transferId: transferResult.transferId,
      transferWarning: transferResult.transferError,
      connectAccountId: transferResult.techStripeAccountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Capture failed';
    return jsonResponse({ error: message }, 500);
  }
});
