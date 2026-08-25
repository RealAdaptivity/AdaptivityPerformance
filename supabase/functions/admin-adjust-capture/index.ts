import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  captureHelcimPreauth,
  isHelcimApproved,
  centsToAmount,
  amountToCents,
} from './_shared/helcim.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';
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
        'id, reference_code, helcim_transaction_id, payment_status, hold_amount_cents, total_estimate, mechanic_id'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const helcimTransactionId = booking.helcim_transaction_id as string | null;
    if (!helcimTransactionId) {
      return jsonResponse({ error: 'No payment hold on this booking' }, 400);
    }

    if (booking.payment_status === 'captured') {
      return jsonResponse({ error: 'Payment already captured. Use refund to adjust.' }, 400);
    }

    const holdCents =
      booking.hold_amount_cents ?? Math.round(Number(booking.total_estimate) * 100);
    const captureCents = Math.round(captureDollars * 100);
    if (captureCents > holdCents) {
      return jsonResponse({ error: `Capture cannot exceed hold ($${(holdCents / 100).toFixed(2)})` }, 400);
    }

    // Capture less than the authorized amount. Helcim allows a capture below the
    // preauth but never above it, which is why captureCents is clamped to the
    // hold before we get here.
    const capture = await captureHelcimPreauth({
      preauthTransactionId: helcimTransactionId,
      amount: centsToAmount(captureCents),
      idempotencySeed: `adj_${booking.id}_${captureCents}`,
    });
    if (!isHelcimApproved(capture.status)) {
      return jsonResponse({ error: `Cannot capture (Helcim status: ${capture.status})` }, 400);
    }

    const capturedCents = amountToCents(capture.amount) || captureCents;
    const split = splitJobTotalCents(capturedCents);

    // Accrue rather than transfer: same as the main capture path.
    let payoutWarning: string | null = null;
    if (booking.mechanic_id && split.techTransferCents > 0) {
      const { error: payoutError } = await supabase.from('tech_payouts').upsert(
        {
          booking_id: booking.id,
          booking_reference: booking.reference_code,
          mechanic_id: booking.mechanic_id,
          amount_cents: split.techTransferCents,
          status: 'accrued',
          notes: 'Adjusted capture',
        },
        { onConflict: 'booking_id' }
      );
      if (payoutError) {
        payoutWarning = payoutError.message;
        console.error('[admin-adjust-capture] tech_payouts upsert failed', payoutError.message);
      }
    } else if (!booking.mechanic_id) {
      payoutWarning = 'No technician assigned; nothing accrued.';
    }

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
        processor: 'helcim',
        status: 'succeeded',
        amount_cents: capturedCents,
        helcim_capture_transaction_id: capture.transactionId,
        platform_fee_cents: split.platformFeeCents,
        tech_transfer_cents: split.techTransferCents,
        payout_status: payoutWarning ? 'none' : 'accrued',
        payout_error: payoutWarning,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', booking.id);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      capturedAmountDollars: capturedCents / 100,
      techShareDollars: split.techTransferCents / 100,
      platformShareDollars: split.platformFeeCents / 100,
      markCompleted,
      captureTransactionId: capture.transactionId,
      payoutWarning,
    });
  } catch (err) {
    console.error('[admin-adjust-capture]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Partial capture failed' },
      500
    );
  }
});
