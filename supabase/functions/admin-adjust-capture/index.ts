import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/paypal.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';
import { finalizeJobCharges } from './_shared/jobCharges.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('PAYPAL_CLIENT_ID')?.trim() || !Deno.env.get('PAYPAL_CLIENT_SECRET')?.trim()) {
      return jsonResponse(
        { error: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured on Supabase Edge Functions.' },
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
        'id, reference_code, paypal_capture_id, payment_status, hold_amount_cents, total_estimate, mechanic_id'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.payment_status === 'captured') {
      return jsonResponse({ error: 'Job already settled. Use refund to adjust.' }, 400);
    }

    const depositCents =
      booking.hold_amount_cents ?? Math.round(Number(booking.total_estimate) * 100);
    const captureCents = Math.round(captureDollars * 100);
    if (captureCents > depositCents) {
      return jsonResponse(
        {
          error: `Cannot settle above the $${(depositCents / 100).toFixed(2)} deposit here — send a payment link for the balance instead.`,
        },
        400
      );
    }

    // Settling at an admin-chosen total is the same operation the tech performs
    // at job completion, so it goes through the same path rather than keeping a
    // parallel implementation that could drift. Below the deposit, that means
    // refunding the difference.
    const result = await finalizeJobCharges({
      supabase,
      bookingId: booking.id,
      bookingReference: booking.reference_code,
      mechanicId: booking.mechanic_id,
      depositCaptureId: booking.paypal_capture_id ?? null,
      depositCents,
      totalChargeCents: captureCents,
      source: 'admin_adjust',
    });

    const capturedCents = result.collectedCents;
    const payoutWarning = result.payoutError;

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


    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      capturedAmountDollars: capturedCents / 100,
      techShareDollars: result.techTransferCents / 100,
      platformShareDollars: result.platformFeeCents / 100,
      refundedDollars: result.refundedCents / 100,
      markCompleted,
      refundId: result.refundId,
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
