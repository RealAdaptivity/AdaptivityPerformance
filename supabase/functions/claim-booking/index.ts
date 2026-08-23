/// <reference path="../deno.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';

Deno.serve(async (req: Request) => {
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

    // Only admins may claim a job on behalf of another technician; everyone
    // else claims strictly for themselves regardless of the requested id.
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = profile?.role === 'admin';

    const requestedId = typeof mechanicId === 'string' ? mechanicId.trim() : '';
    if (requestedId && requestedId !== user.id && !isAdmin) {
      return jsonResponse({ error: 'You can only claim jobs for yourself.' }, 403);
    }
    const assignedId = requestedId || user.id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const cleanRef = bookingReference.trim();
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, reference_code, status, mechanic_id')
      .ilike('reference_code', cleanRef)
      .maybeSingle();

    if (fetchErr || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    // A technician cannot take over a job already claimed by someone else.
    if (!isAdmin && booking.mechanic_id && booking.mechanic_id !== assignedId) {
      return jsonResponse({ error: 'This job has already been claimed by another technician.' }, 409);
    }

    // Atomic guard: for non-admins, only update rows still unclaimed or already
    // owned by this technician, so two simultaneous claims can't both succeed.
    let updateQuery = supabase
      .from('bookings')
      .update({
        status: 'EN_ROUTE',
        mechanic_id: assignedId,
        eta_minutes: 20,
        distance_miles: 8,
        updated_at: new Date().toISOString(),
      })
      .ilike('reference_code', cleanRef);

    if (!isAdmin) {
      updateQuery = updateQuery.or(`mechanic_id.is.null,mechanic_id.eq.${assignedId}`);
    }

    const { data: updated, error: updateErr } = await updateQuery.select().maybeSingle();

    if (updateErr) {
      return jsonResponse({ error: updateErr.message || 'Update failed' }, 500);
    }

    if (!updated) {
      return jsonResponse({ error: 'This job has already been claimed by another technician.' }, 409);
    }

    return jsonResponse({ ok: true, booking: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return jsonResponse({ error: msg }, 500);
  }
});
