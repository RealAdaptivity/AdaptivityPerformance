import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { recoverConnectAccountForProfile } from './_shared/connectAccountRecovery.ts';

type ExternalCard = {
  id?: string;
  object?: string;
  brand?: string;
  last4?: string;
  available_payout_methods?: string[];
};

Deno.serve(async (req) => {
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

    const body = await req.json().catch(() => ({} as { token?: string }));
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token.startsWith('tok_')) {
      return jsonResponse(
        { error: 'A valid Stripe card token (tok_…) is required.' },
        400
      );
    }

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
    if (!accountId?.startsWith('acct_') && user.email) {
      accountId = await recoverConnectAccountForProfile(user.id, user.email);
      if (accountId?.startsWith('acct_')) {
        await supabase.from('mechanic_details').upsert(
          { profile_id: user.id, stripe_account_id: accountId },
          { onConflict: 'profile_id' }
        );
      }
    }

    if (!accountId?.startsWith('acct_')) {
      return jsonResponse(
        { error: 'Connect Stripe Express first (identity + bank), then add an Instant debit card.' },
        400
      );
    }

    let card: ExternalCard;
    try {
      card = (await stripeRequest(`/accounts/${accountId}/external_accounts`, 'POST', {
        external_account: token,
        // Keep existing bank as default for Standard ACH cash out.
        default_for_currency: false,
      })) as ExternalCard;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not attach debit card';
      if (/default_for_currency|default for currency/i.test(msg)) {
        card = (await stripeRequest(`/accounts/${accountId}/external_accounts`, 'POST', {
          external_account: token,
        })) as ExternalCard;
      } else if (/debit cards?.*(not|disallow|disabled|not enabled)/i.test(msg)) {
        return jsonResponse(
          {
            error:
              'Platform has not enabled debit cards for Connect. In Stripe Dashboard (test/live matching your keys): Connect → Settings → Payouts → External accounts → Allow debit cards? = Yes.',
          },
          400
        );
      } else if (/required permissions|does not have the required permissions/i.test(msg)) {
        return jsonResponse(
          {
            error:
              'Express accounts cannot receive debit cards via the platform API. Use Settings → Add Instant debit card (Stripe embedded Payouts / Account UI) instead.',
          },
          403
        );
      } else {
        throw e;
      }
    }

    const methods = card.available_payout_methods ?? [];
    const instantOk = methods.includes('instant');

    return jsonResponse({
      ok: true,
      accountId,
      cardId: card.id,
      brand: card.brand,
      last4: card.last4,
      hasDebitCardForInstant: instantOk,
      availablePayoutMethods: methods,
      message: instantOk
        ? `Debit card •••• ${card.last4 ?? '????'} added for Instant cash out.`
        : `Card •••• ${card.last4 ?? '????'} saved, but Stripe did not mark it Instant-eligible (use a US debit Visa/Mastercard; test: 4000056655665556).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Attach debit card failed';
    console.error('[attach-tech-debit-card]', message);
    return jsonResponse({ error: message }, 500);
  }
});
