import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';
import { cancelBookingHoldForRow } from './_shared/cancelHold.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const admin = await requireAdminUser(req);
    if (!admin.ok) return admin.response;

    const { bookingReference, releaseJob } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, payment_intent_id, payment_status')
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const result = await cancelBookingHoldForRow(supabase, booking, {
      releaseJob: Boolean(releaseJob),
    });

    return jsonResponse({
      ok: true,
      ...result,
      released: Boolean(releaseJob),
    });
  } catch (err) {
    console.error('[admin-cancel-booking-hold]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Failed to cancel booking hold' },
      500
    );
  }
});
