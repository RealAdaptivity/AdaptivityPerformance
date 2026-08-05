import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
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
    if (!user?.id || !user.email?.trim()) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const bookingReference =
      typeof body?.bookingReference === 'string' ? body.bookingReference.trim() : '';
    if (!bookingReference) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, customer_id')
      .eq('reference_code', bookingReference)
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.customer_id === user.id) {
      return jsonResponse({ ok: true, alreadyLinked: true, bookingId: booking.id });
    }

    if (booking.customer_id) {
      return jsonResponse({ error: 'This booking is already linked to another account' }, 403);
    }

    const authEmail = user.email.trim().toLowerCase();
    const { data: byBookingId } = await supabase
      .from('payments')
      .select('customer_email')
      .eq('booking_id', booking.id)
      .not('customer_email', 'is', null)
      .limit(5);
    let paymentEmail = (byBookingId || [])
      .map((p) => (p.customer_email || '').trim().toLowerCase())
      .find((e) => e.length > 0);

    if (!paymentEmail) {
      const { data: byRef } = await supabase
        .from('payments')
        .select('customer_email')
        .eq('booking_reference', bookingReference)
        .not('customer_email', 'is', null)
        .limit(5);
      paymentEmail = (byRef || [])
        .map((p) => (p.customer_email || '').trim().toLowerCase())
        .find((e) => e.length > 0);
    }

    if (!paymentEmail || paymentEmail !== authEmail) {
      return jsonResponse(
        { error: 'Email on this booking does not match your account. Use the same email you booked with.' },
        403
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ customer_id: user.id })
      .eq('id', booking.id)
      .is('customer_id', null);

    if (updateError) {
      return jsonResponse({ error: updateError.message || 'Could not link booking' }, 500);
    }

    return jsonResponse({ ok: true, bookingId: booking.id });
  } catch (err) {
    console.error('[link-guest-booking]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Failed to link booking' },
      500
    );
  }
});
