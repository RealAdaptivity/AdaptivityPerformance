import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
import { requireAdminUser } from '../_shared/adminAuth.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
    const gate = await requireAdminUser(req);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!applicationId) return jsonResponse({ error: 'applicationId is required' }, 400);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return jsonResponse({ error: 'Enter a valid email address' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: application, error: fetchError } = await admin
      .from('tech_applications')
      .select('id, email, profile_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (fetchError || !application) {
      return jsonResponse({ error: fetchError?.message || 'Application not found' }, 404);
    }

    const oldEmail = String(application.email || '').trim().toLowerCase();
    const profileId = application.profile_id as string | null;
    if (oldEmail === email) return jsonResponse({ ok: true, email, loginUpdated: false });

    let loginUpdated = false;
    if (profileId) {
      const { data: existing, error: lookupError } = await admin.auth.admin.getUserById(profileId);
      if (lookupError || !existing.user) {
        return jsonResponse({ error: lookupError?.message || 'Linked login not found' }, 400);
      }
      const { error: authError } = await admin.auth.admin.updateUserById(profileId, {
        email,
        email_confirm: true,
      });
      if (authError) return jsonResponse({ error: authError.message }, 400);
      loginUpdated = true;
    }

    const { error: appError } = await admin
      .from('tech_applications')
      .update({ email })
      .eq('id', applicationId);
    if (appError) return jsonResponse({ error: appError.message }, 400);
    if (profileId) {
      const { error: profileError } = await admin.from('profiles').update({ email }).eq('id', profileId);
      if (profileError) return jsonResponse({ error: profileError.message }, 400);
    }
    return jsonResponse({ ok: true, email, loginUpdated });
  } catch (error) {
    console.error('[update-tech-application-email]', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Could not update application email' },
      500
    );
  }
});
