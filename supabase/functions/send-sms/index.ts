import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';
import { sendTwilioSms } from './_shared/twilioSms.ts';

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

    const { to, body, bookingReference } = await req.json();
    if (!to?.trim() || !body?.trim()) {
      return jsonResponse({ error: 'to and body are required' }, 400);
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role;
    if (role !== 'tech' && role !== 'admin') {
      return jsonResponse({ error: 'Only techs/admins can send SMS' }, 403);
    }

    if (bookingReference?.trim() && role === 'tech') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: booking } = await supabase
        .from('bookings')
        .select('mechanic_id')
        .eq('reference_code', bookingReference.trim())
        .maybeSingle();
      if (booking?.mechanic_id && booking.mechanic_id !== user.id) {
        return jsonResponse({ error: 'Not your booking' }, 403);
      }
    }

    const result = await sendTwilioSms(String(to), String(body));
    if (result.error && !result.skipped) {
      return jsonResponse({ error: result.error, ...result }, 400);
    }
    return jsonResponse({ ok: true, ...result });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'SMS failed' }, 500);
  }
});
