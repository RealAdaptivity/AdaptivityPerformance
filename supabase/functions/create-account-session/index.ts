import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from '../_shared/stripe.ts';
import { recoverConnectAccountForProfile, tagConnectAccountProfile } from '../_shared/connectAccountRecovery.ts';
import { expressAccountCreatePayload, stripeBusinessProfileSite } from '../_shared/connectBranding.ts';

/**
 * Account Session for Connect embedded components:
 * - account_onboarding (embedded onboarding & W-9 collection)
 * - account_management (manage banks, debit cards, identity)
 * - payouts (view payout history & manage instant debit cards)
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY is not configured.' }, 503);
    }

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: details } = await supabase
      .from('mechanic_details')
      .select('stripe_account_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    let accountId = details?.stripe_account_id as string | undefined;
    const techName = (user.user_metadata?.full_name as string) || 'Technician';
    const techEmail = user.email?.trim() || '';

    if (!accountId?.startsWith('acct_') && techEmail) {
      accountId = await recoverConnectAccountForProfile(user.id, techEmail);
      if (accountId?.startsWith('acct_')) {
        await supabase.from('mechanic_details').upsert(
          { profile_id: user.id, stripe_account_id: accountId },
          { onConflict: 'profile_id' }
        );
      }
    }

    // Auto-create Connect account if missing
    if (!accountId?.startsWith('acct_')) {
      if (!techEmail) {
        return jsonResponse({ error: 'Your account must have an email to set up Stripe payouts.' }, 400);
      }
      const businessSite = stripeBusinessProfileSite();
      const account = (await stripeRequest(
        '/accounts',
        'POST',
        expressAccountCreatePayload(businessSite, techEmail, {
          adaptivity_profile_id: user.id,
          tech_name: techName,
        })
      )) as { id: string };

      accountId = account.id;
      await supabase.from('mechanic_details').upsert(
        { profile_id: user.id, stripe_account_id: accountId },
        { onConflict: 'profile_id' }
      );
      try {
        await tagConnectAccountProfile(accountId, user.id, techName);
      } catch {
        /* best-effort tag */
      }
    }

    const session = (await stripeRequest('/account_sessions', 'POST', {
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        payouts: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            external_account_collection: true,
          },
        },
      },
    })) as { client_secret?: string };

    if (!session.client_secret) {
      return jsonResponse({ error: 'Stripe did not return an Account Session client secret.' }, 500);
    }

    return jsonResponse({
      clientSecret: session.client_secret,
      accountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account session failed';
    console.error('[create-account-session]', message);
    return jsonResponse({ error: message }, 500);
  }
});
