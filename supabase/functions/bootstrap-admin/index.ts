import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method === 'GET') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }
    return jsonResponse({ hasAdmin: (count ?? 0) > 0 });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const expectedSecret = Deno.env.get('ADMIN_BOOTSTRAP_SECRET');
    if (!expectedSecret?.trim()) {
      return jsonResponse(
        {
          error:
            'Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_SECRET in Supabase Edge Function secrets.',
        },
        503
      );
    }

    const { email, password, fullName, bootstrapCode } = await req.json();
    if (bootstrapCode !== expectedSecret) {
      return jsonResponse({ error: 'Invalid bootstrap code' }, 403);
    }
    if (!email?.trim() || !password || password.length < 8) {
      return jsonResponse({ error: 'Valid email and password (8+ chars) required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { count: adminCount, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      return jsonResponse({ error: countError.message }, 500);
    }
    if ((adminCount ?? 0) > 0) {
      return jsonResponse({ error: 'An admin account already exists. Sign in instead.' }, 409);
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: fullName?.trim() || 'Dispatch Admin',
      },
    });

    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message || 'Failed to create admin user' }, 400);
    }

    // handle_new_user ignores "admin" from metadata (signup hardening) — promote explicitly.
    const { error: promoteError } = await supabase.rpc('promote_profile_to_admin', {
      target_id: created.user.id,
    });

    if (promoteError) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          full_name: fullName?.trim() || 'Dispatch Admin',
          email: email.trim(),
        })
        .eq('id', created.user.id);
      if (updateError) {
        return jsonResponse(
          {
            error: `User created but profile not promoted to admin: ${promoteError.message}`,
          },
          500
        );
      }
    } else {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName?.trim() || 'Dispatch Admin',
          email: email.trim(),
        })
        .eq('id', created.user.id);
    }

    return jsonResponse({
      ok: true,
      email: created.user.email,
      message: 'Admin account created. Sign in with your email and password.',
    });
  } catch (err) {
    console.error('[bootstrap-admin]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Bootstrap failed' },
      500
    );
  }
});
