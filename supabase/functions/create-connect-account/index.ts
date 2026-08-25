import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from '../_shared/stripe.ts';
import {
  expressAccountBrandingUpdate,
  expressAccountCapabilityRequest,
  expressAccountCreatePayload,
  resolveTechStripeConnectRedirectUrls,
  stripeBusinessProfileSite,
} from '../_shared/connectBranding.ts';
import {
  countConnectAccountsForEmail,
  recoverConnectAccountForProfile,
  tagConnectAccountProfile,
} from '../_shared/connectAccountRecovery.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { techName, techEmail, profileId, returnUrl, refreshUrl } = await req.json();
    if (!techEmail?.trim()) {
      return jsonResponse({ error: 'techEmail is required' }, 400);
    }
    if (!profileId?.trim()) {
      return jsonResponse(
        {
          error:
            'profileId is required. Use create-stripe-account-link from the signed-in tech portal — this endpoint no longer creates anonymous Connect accounts.',
        },
        400
      );
    }

    const businessSite = stripeBusinessProfileSite(returnUrl || refreshUrl);
    const { returnUrl: safeReturn, refreshUrl: safeRefresh } = resolveTechStripeConnectRedirectUrls({
      returnUrl,
      refreshUrl,
    });
    const email = techEmail.trim();
    const pid = profileId.trim();

    let createdNew = false;
    let accountId = await recoverConnectAccountForProfile(pid, email);

    if (!accountId?.startsWith('acct_')) {
      const dup = await countConnectAccountsForEmail(email);
      if (dup > 0) {
        return jsonResponse(
          {
            error:
              'Connect account(s) exist for this email but could not be linked. Sign in to the tech portal Settings tab to reconcile, or remove duplicate test accounts in Stripe.',
            stripeAccountsForEmail: dup,
          },
          409
        );
      }
      const account = await stripeRequest(
        '/accounts',
        'POST',
        expressAccountCreatePayload(businessSite, email, {
          adaptivity_profile_id: pid,
          tech_name: techName || '',
        })
      );
      accountId = account.id as string;
      createdNew = true;
    } else {
      await tagConnectAccountProfile(accountId, pid, techName || 'Technician');
    }

    const accountLink = await stripeRequest('/account_links', 'POST', {
      account: accountId,
      refresh_url: safeRefresh,
      return_url: safeReturn,
      type: 'account_onboarding',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await supabase.from('mechanic_details').upsert(
      {
        profile_id: pid,
        stripe_account_id: accountId,
      },
      { onConflict: 'profile_id' }
    );

    return jsonResponse({
      accountId,
      onboardingUrl: accountLink.url,
      reusedExisting: !createdNew,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connect onboarding failed';
    return jsonResponse({ error: message }, 500);
  }
});
