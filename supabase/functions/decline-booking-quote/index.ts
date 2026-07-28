import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';
import { captureHoldAndRemainder } from './_shared/captureHold.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { bookingReference, reason, chargeDiagnostic = true } = await req.json();
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
        'id, reference_code, customer_id, mechanic_id, payment_intent_id, hold_amount_cents, quote_status, active_quote_id'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = profile?.role === 'admin';
    const isCustomer = booking.customer_id === user.id;
    const isAssignedTech = booking.mechanic_id === user.id;
    const role = profile?.role as string | undefined;
    const isTechRole = role === 'tech' || role === 'mechanic';
    const isGuestCustomer = !booking.customer_id && !isTechRole && !isAssignedTech;
    if (!isAdmin && !isCustomer && !isGuestCustomer) {
      return jsonResponse(
        { error: 'Sign in with the account used to book, then decline this quote.' },
        403
      );
    }
    if (booking.quote_status !== 'quote_pending' || !booking.active_quote_id) {
      return jsonResponse({ error: 'No pending quote to decline' }, 400);
    }

    const { data: quote } = await supabase
      .from('booking_quotes')
      .select('id, diagnostic_fee_cents, status')
      .eq('id', booking.active_quote_id)
      .maybeSingle();

    if (!quote || quote.status !== 'pending') {
      return jsonResponse({ error: 'Pending quote not found' }, 404);
    }

    let capturedCents = 0;
    let transferWarning: string | null = null;

    if (chargeDiagnostic && booking.payment_intent_id) {
      const diagnosticCents = quote.diagnostic_fee_cents ?? booking.hold_amount_cents ?? 10000;
      const holdCents = booking.hold_amount_cents ?? diagnosticCents;
      const result = await captureHoldAndRemainder({
        supabase,
        bookingId: booking.id,
        bookingReference: booking.reference_code,
        mechanicId: booking.mechanic_id,
        paymentIntentId: booking.payment_intent_id,
        holdCents,
        totalChargeCents: Math.min(diagnosticCents, holdCents),
        source: 'quote_decline_diagnostic',
      });
      capturedCents = result.capturedCents;
      transferWarning = result.transferError;
    }

    await supabase
      .from('booking_quotes')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        declined_reason: typeof reason === 'string' ? reason.trim() : null,
        capture_amount_cents: capturedCents || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id);

    await supabase
      .from('bookings')
      .update({
        quote_status: 'quote_declined',
        payment_status: capturedCents > 0 ? 'captured' : booking.payment_intent_id ? 'authorized' : 'none',
        captured_amount_cents: capturedCents > 0 ? capturedCents : null,
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      chargedDiagnosticDollars: capturedCents / 100,
      transferWarning,
      message:
        capturedCents > 0
          ? 'Repairs declined. Diagnostic fee was charged from your card hold.'
          : 'Quote declined.',
    });
  } catch (err) {
    console.error('[decline-booking-quote]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Decline quote failed' },
      500
    );
  }
});
