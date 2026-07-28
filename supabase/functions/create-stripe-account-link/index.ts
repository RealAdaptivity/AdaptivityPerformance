import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import {
  expressAccountBrandingUpdate,
  expressAccountCapabilityRequest,
  expressAccountCreatePayload,
  resolveTechStripeConnectRedirectUrls,
  stripeBusinessProfileSite,
} from './_shared/connectBranding.ts';
import { recoverConnectAccountForProfile, countConnectAccountsForEmail, tagConnectAccountProfile } from './_shared/connectAccountRecovery.ts';

type StripeAccount = {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  metadata?: Record<string, string>;
  capabilities?: {
    /** Stripe REST returns "active" | { status: "active" } depending on API shape. */
    transfers?: string | { status?: string };
    card_payments?: string | { status?: string };
  };
  requirements?: {
    currently_due?: string[];
    disabled_reason?: string | null;
  };
};

function capabilityIsActive(cap: string | { status?: string } | undefined): boolean {
  if (!cap) return false;
  if (typeof cap === 'string') return cap === 'active';
  return cap.status === 'active';
}

function transfersCapabilityActive(account: StripeAccount | null): boolean {
  return capabilityIsActive(account?.capabilities?.transfers);
}

type ExternalAccountRow = {
  object?: string;
  available_payout_methods?: string[];
};

async function readExternalAccountFlags(accountId: string): Promise<{
  hasDebitCardForInstant: boolean;
  hasBankAccount: boolean;
}> {
  try {
    const listed = (await stripeRequest(
      `/accounts/${accountId}/external_accounts?limit=20`,
      'GET'
    )) as { data?: ExternalAccountRow[] };
    const accounts = listed.data ?? [];
    return {
      hasDebitCardForInstant: accounts.some(
        (a) =>
          a.object === 'card' &&
          Array.isArray(a.available_payout_methods) &&
          a.available_payout_methods.includes('instant')
      ),
      hasBankAccount: accounts.some((a) => a.object === 'bank_account'),
    };
  } catch {
    return { hasDebitCardForInstant: false, hasBankAccount: false };
  }
}

function taxIdRequirementsOpen(account: StripeAccount | null): boolean {
  const due = [
    ...(account?.requirements?.currently_due ?? []),
    ...(account?.requirements?.past_due ?? []),
  ];
  return due.some(
    (f) =>
      f.includes('id_number') ||
      f.includes('ssn') ||
      f.includes('tax_id') ||
      f === 'individual.verification.document'
  );
}

function accountStatusPayload(
  account: StripeAccount | null,
  flags?: { hasDebitCardForInstant?: boolean; hasBankAccount?: boolean }
) {
  if (!account?.id) {
    return {
      accountId: null as string | null,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      transfersEnabled: false,
      readyForPayouts: false,
      taxIdProvided: false,
      requirementsDue: [] as string[],
      hasDebitCardForInstant: false,
      hasBankAccount: false,
    };
  }
  const transfersEnabled = transfersCapabilityActive(account);
  const taxIdProvided =
    Boolean(account.details_submitted) && !taxIdRequirementsOpen(account);
  return {
    accountId: account.id,
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    transfersEnabled,
    readyForPayouts:
      transfersEnabled &&
      Boolean(account.details_submitted) &&
      Boolean(account.charges_enabled) &&
      Boolean(account.payouts_enabled),
    taxIdProvided,
    requirementsDue: account.requirements?.currently_due ?? [],
    hasDebitCardForInstant: flags?.hasDebitCardForInstant === true,
    hasBankAccount: flags?.hasBankAccount === true,
  };
}

async function ensureMechanicDetailsRow(
  supabase: SupabaseClient,
  profileId: string,
  techName: string
) {
  const { data: existing } = await supabase
    .from('mechanic_details')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existing?.profile_id) return;

  const { error } = await supabase.from('mechanic_details').insert({
    profile_id: profileId,
    van_number: 'Mobile Unit',
    role_title: techName || 'ASE Technician',
  });

  if (error) {
    throw new Error(`Could not create mechanic profile: ${error.message}`);
  }
}

async function persistStripeAccountId(
  supabase: SupabaseClient,
  profileId: string,
  stripeAccountId: string,
  techName: string
) {
  await ensureMechanicDetailsRow(supabase, profileId, techName);

  const { error } = await supabase.from('mechanic_details').upsert(
    {
      profile_id: profileId,
      stripe_account_id: stripeAccountId,
    },
    { onConflict: 'profile_id' }
  );

  if (error) {
    throw new Error(`Could not save Stripe account to your profile: ${error.message}`);
  }
}

async function syncTaxIdAndW9Flag(
  supabase: SupabaseClient,
  profileId: string,
  taxIdProvided: boolean
) {
  if (!taxIdProvided) {
    await supabase
      .from('mechanic_details')
      .update({ tax_id_provided: false })
      .eq('profile_id', profileId);
    return;
  }
  // Tax ID collected in Stripe = W-9 purpose satisfied; never store SSN/EIN ourselves.
  await supabase
    .from('mechanic_details')
    .update({
      tax_id_provided: true,
      w9_completed_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .is('w9_completed_at', null);

  await supabase
    .from('mechanic_details')
    .update({ tax_id_provided: true })
    .eq('profile_id', profileId);
}

async function clearStoredStripeAccountId(supabase: SupabaseClient, profileId: string) {
  await supabase
    .from('mechanic_details')
    .update({ stripe_account_id: null })
    .eq('profile_id', profileId);
}

/** DB may reference a Connect account deleted in Stripe Dashboard. */
async function resolveLiveConnectAccountId(
  supabase: SupabaseClient,
  profileId: string,
  candidate: string | undefined
): Promise<string | undefined> {
  if (!candidate?.startsWith('acct_')) return undefined;
  try {
    await stripeRequest(`/accounts/${candidate}`, 'GET');
    return candidate;
  } catch {
    await clearStoredStripeAccountId(supabase, profileId);
    return undefined;
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      return jsonResponse(
        { error: 'STRIPE_SECRET_KEY is not configured on Supabase Edge Functions.' },
        503
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
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

    if (!techEmail) {
      return jsonResponse({ error: 'Your account must have an email to set up Stripe payouts.' }, 400);
    }

    const businessSite = stripeBusinessProfileSite(body.returnUrl || body.refreshUrl);
    const redirectUrls = resolveTechStripeConnectRedirectUrls(body);
    const statusOnly = body.action === 'status' || body.action === 'sync';
    const expressLogin =
      body.action === 'express_login' || body.action === 'express_dashboard';

    const reconcileCanonicalAccount = async (): Promise<string | undefined> => {
      const canonical = await recoverConnectAccountForProfile(user.id, techEmail);
      if (canonical?.startsWith('acct_')) {
        const live = await resolveLiveConnectAccountId(supabase, user.id, canonical);
        if (!live) return undefined;
        await persistStripeAccountId(supabase, user.id, live, techName);
        try {
          await tagConnectAccountProfile(live, user.id, techName);
        } catch (e) {
          console.warn('[create-stripe-account-link] metadata tag:', e);
        }
        return live;
      }
      return resolveLiveConnectAccountId(supabase, user.id, accountId);
    };

    accountId = await reconcileCanonicalAccount();

    if (!accountId?.startsWith('acct_')) {
      if (statusOnly || expressLogin) {
        return jsonResponse(
          expressLogin
            ? {
                ...accountStatusPayload(null),
                error: 'Connect Stripe Express first, then open the Express Dashboard to add a debit card.',
              }
            : accountStatusPayload(null),
          expressLogin ? 400 : 200
        );
      }
      const existingForEmail = await countConnectAccountsForEmail(techEmail);
      if (existingForEmail > 0) {
        return jsonResponse(
          {
            error:
              'Stripe already has Connect account(s) for this email but none could be linked. Use the tech portal while signed in, or clean up duplicate test accounts in the Stripe Dashboard.',
            stripeAccountsForEmail: existingForEmail,
          },
          409
        );
      }

      const account = await stripeRequest(
        '/accounts',
        'POST',
        expressAccountCreatePayload(businessSite, techEmail, {
          adaptivity_profile_id: user.id,
          tech_name: techName,
        })
      );
      accountId = account.id as string;
      await persistStripeAccountId(supabase, user.id, accountId, techName);
    } else {
      await stripeRequest(`/accounts/${accountId}`, 'POST', {
        ...expressAccountBrandingUpdate(businessSite),
        ...expressAccountCapabilityRequest(),
        metadata: {
          adaptivity_profile_id: user.id,
          tech_name: techName,
        },
      });
    }

    const account = (await stripeRequest(`/accounts/${accountId}`, 'GET')) as StripeAccount;
    const externalFlags = await readExternalAccountFlags(accountId);

    await persistStripeAccountId(supabase, user.id, accountId, techName);
    const statusPayload = accountStatusPayload(account, externalFlags);
    await syncTaxIdAndW9Flag(supabase, user.id, statusPayload.taxIdProvided);

    if (statusOnly) {
      const duplicateStripeAccounts = await countConnectAccountsForEmail(techEmail);
      return jsonResponse({
        ...statusPayload,
        savedToProfile: true,
        duplicateStripeAccountsForEmail: duplicateStripeAccounts,
        usingAccountId: accountId,
      });
    }

    // Debit cards for Instant are managed in the Express Dashboard — not Account Link onboarding.
    if (expressLogin) {
      const login = (await stripeRequest(
        `/accounts/${accountId}/login_links`,
        'POST'
      )) as { url?: string };
      if (!login.url?.startsWith('http')) {
        return jsonResponse(
          { error: 'Stripe did not return an Express Dashboard login link. Try again in a moment.' },
          500
        );
      }
      return jsonResponse({
        ...statusPayload,
        loginUrl: login.url,
        expressDashboardUrl: login.url,
        usingAccountId: accountId,
        hint:
          'In Express Dashboard: open payout / bank settings → Add debit card (keep your bank for Standard cash out).',
      });
    }

    const { returnUrl, refreshUrl } = redirectUrls;
    // Express accounts with outstanding requirements often only accept account_onboarding,
    // even when details_submitted is already true (e.g. identity document still due).
    const stillNeedsOnboarding =
      !account.details_submitted ||
      !account.charges_enabled ||
      !account.payouts_enabled ||
      (account.requirements?.currently_due?.length ?? 0) > 0 ||
      Boolean(account.requirements?.disabled_reason);

    const preferredType = stillNeedsOnboarding ? 'account_onboarding' : 'account_update';

    let accountLink: { url?: string };
    try {
      accountLink = await stripeRequest('/account_links', 'POST', {
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: preferredType,
      });
    } catch (linkError) {
      const msg = linkError instanceof Error ? linkError.message : String(linkError);
      if (preferredType === 'account_update' && /account_onboarding/i.test(msg)) {
        accountLink = await stripeRequest('/account_links', 'POST', {
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });
      } else {
        throw linkError;
      }
    }

    return jsonResponse({
      ...statusPayload,
      onboardingUrl: accountLink.url as string,
      duplicateStripeAccountsForEmail: await countConnectAccountsForEmail(techEmail),
      usingAccountId: accountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account link failed';
    console.error('[create-stripe-account-link]', message);
    return jsonResponse({ error: message }, 500);
  }
});
