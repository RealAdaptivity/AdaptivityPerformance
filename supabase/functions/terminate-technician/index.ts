import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
import { requireAdminUser } from '../_shared/adminAuth.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    const gate = await requireAdminUser(req);
    if (!gate.ok) return gate.response;
    const body = await req.json().catch(() => ({}));
    const technicianId = typeof body.technicianId === 'string' ? body.technicianId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!technicianId) return jsonResponse({ error: 'technicianId is required' }, 400);
    if (reason.length < 5 || reason.length > 1000) {
      return jsonResponse({ error: 'Enter a termination reason (5–1000 characters)' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile } = await admin.from('profiles').select('role, email').eq('id', technicianId).maybeSingle();
    if (!profile || profile.role !== 'tech') return jsonResponse({ error: 'Technician not found' }, 404);
    const { count } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('mechanic_id', technicianId)
      .in('status', ['EN_ROUTE', 'ON_SITE']);
    if ((count || 0) > 0) {
      return jsonResponse({ error: 'Resolve or reassign the technician’s active job before termination' }, 409);
    }

    const { error: banError } = await admin.auth.admin.updateUserById(technicianId, {
      ban_duration: '876000h',
    });
    if (banError) return jsonResponse({ error: banError.message }, 400);
    const { error: updateError } = await admin
      .from('mechanic_details')
      .update({
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
        terminated_by: gate.userId,
      })
      .eq('profile_id', technicianId);
    if (updateError) return jsonResponse({ error: updateError.message }, 400);
    return jsonResponse({ ok: true, email: profile.email });
  } catch (error) {
    console.error('[terminate-technician]', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Termination failed' }, 500);
  }
});
