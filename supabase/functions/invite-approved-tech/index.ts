import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
import { requireAdminUser } from '../_shared/adminAuth.ts';

/** Live marketing/portal host (custom domain). Override with ADAPTIVITY_SITE_URL if needed. */
const DEFAULT_PORTAL =
  Deno.env.get('ADAPTIVITY_SITE_URL')?.trim().replace(/\/$/, '') ||
  'https://adaptivityperformance.com';

function techInviteRedirectUrl(): string {
  return `${DEFAULT_PORTAL}/portal?techInvite=1`;
}

function specialtyTitle(specialties: string[] | null): string {
  const list = specialties?.length ? specialties : ['mechanical'];
  if (list.length > 1) return 'Multi-Trade Technician';
  const map: Record<string, string> = {
    audio: 'Audio Technician',
    tint: 'Tint Technician',
    wrap: 'Wrap Technician',
    bodywork: 'Body Work Technician',
    modification: 'Modification Technician',
    detailing: 'Detailing Technician',
    tires: 'Tire Technician',
    glass: 'Glass Technician',
    performance: 'Performance Technician',
    mechanical: 'ASE Technician',
  };
  return map[list[0]] || 'ASE Technician';
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match?.id) return match.id;
    if (!data.users.length || data.users.length < 200) break;
  }
  return null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const gate = await requireAdminUser(req);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const applicationId = typeof body.applicationId === 'string' ? body.applicationId : '';
    if (!applicationId) {
      return jsonResponse({ error: 'applicationId is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: app, error: appError } = await supabase
      .from('tech_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (appError || !app) {
      return jsonResponse({ error: appError?.message || 'Application not found' }, 404);
    }
    if (app.status !== 'approved') {
      return jsonResponse({ error: 'Application must be approved before inviting.' }, 400);
    }

    const email = String(app.email || '').trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: 'Application has no email' }, 400);
    }

    const redirectTo = techInviteRedirectUrl();
    const fullName = String(app.full_name || '').trim() || 'Technician';
    const specialties = Array.isArray(app.specialties)
      ? (app.specialties as string[])
      : ['mechanical'];
    const roleTitle = specialtyTitle(specialties);
    const metadata = {
      role: 'tech',
      full_name: fullName,
      phone: String(app.phone || '').trim(),
      van_number: 'Mobile Unit',
      role_title: roleTitle,
      specialties,
      tech_application_id: applicationId,
    };

    let mode: 'invite' | 'recovery' = 'invite';
    let userId = (app.profile_id as string | null) || (await findAuthUserIdByEmail(supabase, email));

    if (!userId) {
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        { data: metadata, redirectTo }
      );
      if (inviteError || !invited.user) {
        const msg = inviteError?.message || 'Could not send invite email';
        if (/already|registered|exists/i.test(msg)) {
          userId = await findAuthUserIdByEmail(supabase, email);
          if (!userId) {
            return jsonResponse({ error: msg }, 400);
          }
          mode = 'recovery';
        } else {
          return jsonResponse({ error: msg }, 400);
        }
      } else {
        userId = invited.user.id;
        mode = 'invite';
      }
    } else {
      mode = 'recovery';
    }

    if (mode === 'recovery') {
      await supabase.auth.admin.updateUserById(userId!, { user_metadata: metadata });
      const { error: resetError } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        return jsonResponse(
          {
            error:
              resetError.message ||
              'Account exists but password setup email failed. Ask them to use Forgot password on /portal.',
          },
          400
        );
      }
    }

    // Promote / provision (service_role bypasses profiles_guard_role).
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId!)
      .maybeSingle();

    if (existingProfile?.role !== 'admin') {
      await supabase.from('profiles').upsert(
        {
          id: userId!,
          role: 'tech',
          full_name: fullName,
          phone: String(app.phone || '').trim() || null,
          email,
        },
        { onConflict: 'id' }
      );
    }

    await supabase.from('mechanic_details').upsert(
      {
        profile_id: userId!,
        van_number: 'Mobile Unit',
        role_title: roleTitle,
        specialties,
        job_capacity: app.job_capacity === 'standalone' ? 'standalone' : 'multi',
      },
      { onConflict: 'profile_id' }
    );

    await supabase
      .from('tech_applications')
      .update({ profile_id: userId })
      .eq('id', applicationId);

    return jsonResponse({
      ok: true,
      email,
      userId,
      mode,
      redirectTo,
      message:
        mode === 'invite'
          ? `Invite emailed to ${email}. They open the link, create a password, then use the tech portal / app.`
          : `Password setup emailed to ${email}. They choose a password, then sign in on the Technician tab.`,
    });
  } catch (err) {
    console.error('[invite-approved-tech]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Invite failed' },
      500
    );
  }
});
