import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

const ALLOWED_WINDOWS = new Set([
  'Morning (8 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 7 PM)',
  'Emergency ASAP',
  '08:00 AM',
  '10:30 AM',
  '01:00 PM',
  '03:30 PM',
  '05:30 PM',
]);

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

    const { bookingReference, preferredDate, preferredTimeWindow, customerNotes, releaseTech } =
      await req.json();

    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }
    if (!preferredDate?.trim() || !preferredTimeWindow?.trim()) {
      return jsonResponse({ error: 'preferredDate and preferredTimeWindow are required' }, 400);
    }

    const dateStr = String(preferredDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return jsonResponse({ error: 'preferredDate must be YYYY-MM-DD' }, 400);
    }
    const windowLabel = String(preferredTimeWindow).trim();
    if (!ALLOWED_WINDOWS.has(windowLabel) && windowLabel.length > 80) {
      return jsonResponse({ error: 'Invalid time window' }, 400);
    }

    const parsed = new Date(`${dateStr}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(parsed.getTime()) || parsed < today) {
      return jsonResponse({ error: 'Preferred date must be today or later' }, 400);
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

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, customer_id, mechanic_id, status, payment_status, preferred_date, preferred_time_window'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (error || !booking) return jsonResponse({ error: 'Booking not found' }, 404);

    const isCustomer = booking.customer_id === user.id;
    if (!isAdmin && !isCustomer) {
      return jsonResponse({ error: 'Only the customer can reschedule this booking' }, 403);
    }

    if (booking.payment_status === 'captured') {
      return jsonResponse({ error: 'This job is already charged — contact support to reschedule.' }, 400);
    }
    if (booking.payment_status === 'canceled' || booking.status === 'CANCELED') {
      return jsonResponse({ error: 'Canceled bookings cannot be rescheduled' }, 400);
    }
    if (booking.status === 'ON_SITE' || booking.status === 'COMPLETED') {
      return jsonResponse(
        { error: 'Tech is already on site or finished — contact support to reschedule.' },
        400
      );
    }

    const patch: Record<string, unknown> = {
      preferred_date: dateStr,
      preferred_time_window: windowLabel,
      updated_at: new Date().toISOString(),
    };
    if (typeof customerNotes === 'string') {
      patch.customer_notes = customerNotes.trim() || null;
    }

    // If already claimed/en route, release back to pool so a tech can re-claim for the new slot
    const shouldRelease =
      releaseTech === true ||
      (booking.status === 'EN_ROUTE' && (isCustomer || isAdmin));
    if (shouldRelease) {
      patch.status = 'UNASSIGNED';
      patch.mechanic_id = null;
      patch.eta_minutes = 0;
      patch.distance_miles = 0;
      patch.dispatch_lat = null;
      patch.dispatch_lng = null;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(patch)
      .eq('id', booking.id);

    if (updateError) {
      return jsonResponse({ error: updateError.message || 'Could not reschedule' }, 500);
    }

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      preferredDate: dateStr,
      preferredTimeWindow: windowLabel,
      releasedTech: Boolean(shouldRelease),
      paymentHoldKept: true,
      message: shouldRelease
        ? 'Rescheduled. Card hold kept. Job returned to the open pool for the new slot.'
        : 'Rescheduled. Card hold kept.',
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Reschedule failed' }, 500);
  }
});
