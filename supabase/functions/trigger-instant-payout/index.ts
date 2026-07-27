import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { recoverConnectAccountForProfile } from './_shared/connectAccountRecovery.ts';
import {
  attemptCashOut,
  friendlyPayoutError,
  readConnectedBalanceCents,
  type CashOutMethod,
} from './_shared/instantPayout.ts';

async function accountExists(accountId: string): Promise<boolean> {
  try {
    await stripeRequest(`/accounts/${accountId}`, 'GET');
    return true;
  } catch {
    return false;
  }
}

async function resolveTechConnectAccountId(
  supabase: SupabaseClient,
  profileId: string,
  email: string | undefined,
  existing: string | null | undefined
): Promise<string | null> {
  if (existing?.startsWith('acct_') && (await accountExists(existing))) {
    return existing;
  }

  if (existing?.startsWith('acct_')) {
    await supabase
      .from('mechanic_details')
      .update({ stripe_account_id: null })
      .eq('profile_id', profileId);
  }

  const recovered = email ? await recoverConnectAccountForProfile(profileId, email) : undefined;
  if (!recovered?.startsWith('acct_') || !(await accountExists(recovered))) return null;

  await supabase.from('mechanic_details').upsert(
    { profile_id: profileId, stripe_account_id: recovered },
    { onConflict: 'profile_id' }
  );

  return recovered;
}

/** Mark open Connect-balance rows as paid after a successful cash out. */
async function markLedgerPaidAfterCashOut(
  supabase: SupabaseClient,
  techProfileId: string,
  payoutId: string | undefined,
  method: 'instant' | 'standard' | undefined
) {
  const payoutStatus = method === 'instant' ? 'instant_paid' : 'paid';
  const payoutMethod = method === 'instant' ? 'instant' : 'standard';

  const { data: rows } = await supabase
    .from('payments')
    .select('id, booking_reference, payout_status, stripe_transfer_id')
    .in('payout_status', ['pending', 'retry_pending'])
    .not('stripe_transfer_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (!rows?.length) return;

  const refs = rows
    .map((r) => r.booking_reference as string | null)
    .filter((r): r is string => Boolean(r));

  if (!refs.length) {
    const ids = rows.map((r) => r.id);
    await supabase
      .from('payments')
      .update({
        payout_status: payoutStatus,
        payout_method: payoutMethod,
        stripe_payout_id: payoutId ?? null,
        payout_error: null,
      })
      .in('id', ids);
    return;
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('reference_code, mechanic_id')
    .in('reference_code', refs);

  const mine = new Set(
    (bookings ?? [])
      .filter((b) => b.mechanic_id === techProfileId)
      .map((b) => b.reference_code as string)
  );

  const ids = rows
    .filter((r) => r.booking_reference && mine.has(r.booking_reference as string))
    .map((r) => r.id);

  if (!ids.length) return;

  await supabase
    .from('payments')
    .update({
      payout_status: payoutStatus,
      payout_method: payoutMethod,
      stripe_payout_id: payoutId ?? null,
      payout_error: null,
    })
    .in('id', ids);
}

function previewHint(balances: Awaited<ReturnType<typeof readConnectedBalanceCents>>): string {
  if (balances.payoutBlockReason) return balances.payoutBlockReason;
  if (balances.availableCents > 0 || balances.instantAvailableCents > 0) {
    return 'Choose Instant (debit card, Stripe fee, ~30 min) or Standard (no Instant fee, ~2 business days to bank).';
  }
  if (balances.pendingCents > 0) {
    return `$${(balances.pendingCents / 100).toFixed(2)} is still settling on Connect.`;
  }
  return 'Complete a captured job so the 70% transfer lands on your Express account, then cash out.';
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
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
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(
      () => ({} as { action?: string; method?: CashOutMethod })
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: details } = await supabase
      .from('mechanic_details')
      .select('stripe_account_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    const accountId = await resolveTechConnectAccountId(
      supabase,
      user.id,
      user.email?.trim(),
      details?.stripe_account_id
    );

    if (body.action === 'preview') {
      if (!accountId) {
        return jsonResponse({
          stripeOnboarded: false,
          stripeAccountId: null,
          instantAvailableCents: 0,
          availableCents: 0,
          pendingCents: 0,
          connectTotalCents: 0,
          cashOutEligibleCents: 0,
          cashOutEligibleDollars: 0,
          connectTotalDollars: 0,
          pendingDollars: 0,
          canCashOut: false,
          hint: 'Complete Stripe Express in Settings (Tech login). Balance is read from your linked acct_…, not the job ledger.',
        });
      }
      const balances = await readConnectedBalanceCents(accountId);
      const canStandard = balances.availableCents > 0 && balances.payoutsEnabled !== false;
      const canInstant =
        balances.hasDebitCardForInstant === true &&
        balances.payoutsEnabled !== false &&
        Math.max(balances.instantAvailableCents, balances.availableCents) > 0;

      return jsonResponse({
        stripeOnboarded: true,
        stripeAccountId: accountId,
        ...balances,
        cashOutEligibleDollars: balances.cashOutEligibleCents / 100,
        availableDollars: balances.availableCents / 100,
        instantEligibleDollars:
          Math.max(balances.instantAvailableCents, balances.availableCents) / 100,
        connectTotalDollars: balances.connectTotalCents / 100,
        pendingDollars: balances.pendingCents / 100,
        canCashOut: canStandard || canInstant,
        canStandardCashOut: canStandard,
        canInstantCashOut: canInstant,
        hasDebitCardForInstant: balances.hasDebitCardForInstant === true,
        hint: previewHint(balances),
      });
    }

    if (!accountId) {
      return jsonResponse(
        {
          error:
            'Complete Stripe Express onboarding in Settings before cash out.',
          stripeOnboarded: false,
        },
        400
      );
    }

    const requested = body.method === 'instant' || body.method === 'standard' ? body.method : null;
    if (!requested) {
      return jsonResponse(
        {
          error:
            'Choose a cash out method: "instant" (debit card, fee) or "standard" (bank, no Instant fee, ~2 business days).',
        },
        400
      );
    }

    const result = await attemptCashOut(accountId, requested);
    if (!result.ok) {
      return jsonResponse(
        { error: friendlyPayoutError(result.error ?? 'Cash out failed'), retryable: result.retryable ?? false },
        400
      );
    }

    try {
      await markLedgerPaidAfterCashOut(supabase, user.id, result.payoutId, result.method);
    } catch (e) {
      console.warn('[trigger-instant-payout] ledger update:', e);
    }

    const paidDollars = (result.amountCents ?? 0) / 100;
    let remainingNote = '';
    try {
      const after = await readConnectedBalanceCents(accountId);
      const remAvail = after.availableCents / 100;
      const remPending = after.pendingCents / 100;
      if (remPending > 0.009) {
        remainingNote = ` $${remPending.toFixed(2)} is still settling (not Instant-cashable yet).`;
      } else if (remAvail > 0.009) {
        remainingNote =
          result.method === 'instant'
            ? ` ~$${remAvail.toFixed(2)} left on Connect (Instant fee buffer / dust) — cash out Standard or Instant again when it’s worth it.`
            : ` $${remAvail.toFixed(2)} still available on Connect.`;
      }
    } catch {
      /* non-fatal */
    }

    return jsonResponse({
      payoutId: result.payoutId,
      method: result.method,
      amountCents: result.amountCents,
      amountDollars: paidDollars,
      message:
        result.method === 'instant'
          ? `Instant transfer of $${paidDollars.toFixed(2)} started — usually ~30 minutes (Stripe Instant fee applies).${remainingNote}`
          : `Standard bank transfer of $${paidDollars.toFixed(2)} started — typically ~2 business days, no Instant fee.${remainingNote}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instant payout failed';
    return jsonResponse({ error: friendlyPayoutError(message) }, 500);
  }
});
