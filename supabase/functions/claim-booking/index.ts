import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';

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

    const { bookingReference, mechanicId } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const assignedId = mechanicId?.trim() || user.id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, reference_code, status, mechanic_id')
      .ilike('reference_code', bookingReference.trim())
      .maybeSingle();

    if (fetchErr || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'EN_ROUTE',
        mechanic_id: assignedId,
        eta_minutes: 20,
        distance_miles: 8,
        updated_at: new Date().toISOString(),
      })
      .ilike('reference_code', bookingReference.trim())
      .select()
      .single();

    if (updateErr) {
      return jsonResponse({ error: updateErr.message || 'Update failed' }, 500);
    }

    return jsonResponse({ ok: true, booking: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return jsonResponse({ error: msg }, 500);
  }
});
