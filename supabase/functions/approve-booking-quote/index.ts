import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';
import { captureHoldAndRemainder } from './_shared/captureHold.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY is not configured.' }, 503);
    }

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
        'id, reference_code, customer_id, mechanic_id, payment_intent_id, payment_status, hold_amount_cents, quote_status, active_quote_id'
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
    // Guest bookings (no customer_id): any signed-in non-tech can approve with the reference.
    const isGuestCustomer = !booking.customer_id && !isTechRole && !isAssignedTech;
    if (!isAdmin && !isCustomer && !isGuestCustomer) {
      return jsonResponse(
        { error: 'Sign in with the account used to book, then approve this quote.' },
        403
      );
    }

    if (booking.quote_status !== 'quote_pending' || !booking.active_quote_id) {
      return jsonResponse({ error: 'No pending quote to approve' }, 400);
    }
    if (!booking.payment_intent_id) {
      return jsonResponse({ error: 'No card hold on this booking' }, 400);
    }

    const { data: quote, error: quoteError } = await supabase
      .from('booking_quotes')
      .select('*')
      .eq('id', booking.active_quote_id)
      .maybeSingle();

    if (quoteError || !quote || quote.status !== 'pending') {
      return jsonResponse({ error: 'Pending quote not found' }, 404);
    }

    const holdCents = booking.hold_amount_cents ?? quote.diagnostic_fee_cents ?? 10000;
    const totalCents = quote.total_cents as number;

    const result = await captureHoldAndRemainder({
      supabase,
      bookingId: booking.id,
      bookingReference: booking.reference_code,
      mechanicId: booking.mechanic_id,
      paymentIntentId: booking.payment_intent_id,
      holdCents,
      totalChargeCents: totalCents,
      source: 'quote_approve',
    });

    await supabase
      .from('booking_quotes')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        capture_amount_cents: result.capturedCents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id);

    await supabase
      .from('bookings')
      .update({
        quote_status: 'quote_approved',
        payment_status: 'captured',
        captured_amount_cents: result.capturedCents,
        total_estimate: result.capturedCents / 100,
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      capturedAmountDollars: result.capturedCents / 100,
      remainderDollars: result.remainderCents / 100,
      techPayoutDollars: result.techTransferCents / 100,
      transferWarning: result.transferError,
      message:
        result.remainderCents > 0
          ? 'Quote approved. Diagnostic hold captured and remaining repairs charged to your card on file.'
          : 'Quote approved and charged from your card hold.',
    });
  } catch (err) {
    console.error('[approve-booking-quote]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Approve quote failed' },
      500
    );
  }
});
