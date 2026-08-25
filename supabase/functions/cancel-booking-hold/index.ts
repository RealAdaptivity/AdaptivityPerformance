import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/paypal.ts';
import { cancelBookingHoldForRow } from './_shared/cancelHold.ts';

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
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { bookingReference, releaseJob = true } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, mechanic_id, customer_id, paypal_capture_id, payment_status, status, hold_amount_cents')
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const isCustomer = booking.customer_id === user.id;
    const isMechanic = booking.mechanic_id === user.id;
    if (!isAdmin && !isMechanic && !isCustomer) {
      return jsonResponse({ error: 'Not authorized to cancel this booking hold' }, 403);
    }

    if (isCustomer && !isAdmin) {
      if (booking.payment_status === 'captured') {
        return jsonResponse({ error: 'This job is already charged — contact support for refunds.' }, 400);
      }
      if (booking.status === 'ON_SITE' || booking.status === 'COMPLETED') {
        return jsonResponse(
          { error: 'Tech is already on site or finished — contact support to cancel.' },
          400
        );
      }
    }

    const result = await cancelBookingHoldForRow(supabase, booking, { releaseJob: Boolean(releaseJob) });

    return jsonResponse({ ok: true, ...result, released: Boolean(releaseJob) });
  } catch (err) {
    console.error('[cancel-booking-hold]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Failed to cancel booking hold' },
      500
    );
  }
});
