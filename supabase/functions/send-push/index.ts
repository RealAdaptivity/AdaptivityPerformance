import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';
import { sendExpoPush } from './_shared/expoPush.ts';

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

    const { profileIds, title, body, data, bookingReference } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return jsonResponse({ error: 'title and body are required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let ids: string[] = Array.isArray(profileIds) ? profileIds.filter(Boolean) : [];
    if (bookingReference?.trim() && ids.length === 0) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id, mechanic_id')
        .eq('reference_code', bookingReference.trim())
        .maybeSingle();
      if (booking?.customer_id) ids.push(booking.customer_id);
    }
    if (ids.length === 0) {
      return jsonResponse({ error: 'profileIds or bookingReference required' }, 400);
    }

    const { data: rows } = await supabase
      .from('device_push_tokens')
      .select('expo_push_token')
      .in('profile_id', ids);

    const tokens = (rows ?? []).map((r) => r.expo_push_token as string);
    const result = await sendExpoPush(tokens, {
      title: String(title),
      body: String(body),
      data: data && typeof data === 'object' ? data : { bookingReference },
    });
    return jsonResponse({ ok: true, ...result });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Push failed' }, 500);
  }
});
