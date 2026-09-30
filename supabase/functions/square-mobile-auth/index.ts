import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { squareConfig } from '../_shared/square.ts';

/**
 * square-mobile-auth — what the tech app needs to authorize Square's Mobile
 * Payments SDK (Tap to Pay): an access token and the location id.
 *
 * Square asks that the token is never stored in the app, so the app fetches it
 * here each time it (re)authorizes and hands it straight to the SDK. Only
 * technicians and admins get it.
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'tech' && profile?.role !== 'admin') {
      return jsonResponse({ error: 'Only technicians can take card payments' }, 403);
    }

    const cfg = squareConfig();
    if (!cfg) {
      return jsonResponse({ error: 'Card payments are not set up yet — ask dispatch.' }, 503);
    }

    return jsonResponse({
      accessToken: cfg.mobileAccessToken,
      locationId: cfg.locationId,
      environment: cfg.environment,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
