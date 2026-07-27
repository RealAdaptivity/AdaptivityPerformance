import { stripeConnectRequest, stripeRequest } from './stripe.ts';

type BalanceEntry = {
  amount: number;
  currency: string;
  destination?: string;
  source_types?: Record<string, number>;
};

export type CashOutMethod = 'instant' | 'standard';

export type InstantPayoutAttempt = {
  ok: boolean;
  payoutId?: string;
  method?: CashOutMethod;
  amountCents?: number;
  error?: string;
  retryable?: boolean;
};

function usdEntry(entries: BalanceEntry[] | undefined): BalanceEntry | undefined {
  return entries?.find((e) => e.currency === 'usd');
}

/** Stripe Instant fee is typically ~1% (min ~$0.50). Keep buffer so full-balance payouts succeed. */
function instantNetAmount(instantAvailableCents: number): number {
  if (instantAvailableCents <= 0) return 0;
  const fee = Math.max(50, Math.ceil(instantAvailableCents * 0.01));
  return Math.max(0, instantAvailableCents - fee - 1);
}

function uniquePositiveAmounts(amounts: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const a of amounts) {
    if (!Number.isFinite(a) || a <= 0 || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}

type ExternalAccount = {
  id?: string;
  object?: string;
  available_payout_methods?: string[];
};

async function loadConnectAccount(connectedAccountId: string) {
  return stripeRequest(`/accounts/${connectedAccountId}`, 'GET') as Promise<{
    payouts_enabled?: boolean;
    requirements?: { currently_due?: string[] };
    external_accounts?: { data?: ExternalAccount[] };
  }>;
}

function hasInstantDebitCard(account: Awaited<ReturnType<typeof loadConnectAccount>>): boolean {
  const accounts = account.external_accounts?.data ?? [];
  return accounts.some(
    (a) =>
      a.object === 'card' &&
      Array.isArray(a.available_payout_methods) &&
      a.available_payout_methods.includes('instant')
  );
}

async function assertPayoutsEnabled(connectedAccountId: string): Promise<string | null> {
  const account = await loadConnectAccount(connectedAccountId);
  if (account.payouts_enabled) return null;
  const due = account.requirements?.currently_due ?? [];
  if (due.some((d) => d.includes('verification.document'))) {
    return 'Stripe is holding payouts until you upload a photo ID. Open Settings → Update payout setup and submit identity verification, then try Instant cash out again.';
  }
  if (due.length) {
    return `Stripe is holding payouts until onboarding is finished (${due.slice(0, 3).join(', ')}). Open Settings → Update payout setup.`;
  }
  return 'Stripe has not enabled payouts on this Express account yet. Finish Settings → Update payout setup, then try again.';
}

/**
 * Pay out the tech share to a connected Express account.
 * Prefers Stripe Instant Payouts (debit card); falls back to standard bank payout.
 */
export async function attemptTechInstantPayout(
  connectedAccountId: string,
  targetAmountCents: number,
  metadata?: Record<string, string>,
  opts?: { preferMethod?: CashOutMethod }
): Promise<InstantPayoutAttempt> {
  if (!connectedAccountId?.startsWith('acct_')) {
    return { ok: false, error: 'Invalid connected account id', retryable: false };
  }
  if (!Number.isFinite(targetAmountCents) || targetAmountCents <= 0) {
    return { ok: false, error: 'Invalid payout amount', retryable: false };
  }

  const blocked = await assertPayoutsEnabled(connectedAccountId);
  if (blocked) {
    return { ok: false, error: blocked, retryable: true };
  }

  const balance = await stripeConnectRequest('/balance', 'GET', undefined, connectedAccountId);
  const instant = usdEntry(balance.instant_available as BalanceEntry[] | undefined);
  const available = usdEntry(balance.available as BalanceEntry[] | undefined);

  const instantAvailable = instant?.amount ?? 0;
  const standardAvailable = available?.amount ?? 0;

  const payoutMeta = {
    platform: 'adaptivity_performance',
    ...metadata,
  };

  const account = await loadConnectAccount(connectedAccountId);
  const canInstant = hasInstantDebitCard(account);
  const prefer = opts?.preferMethod;

  // Auto / standard-first: settled funds → bank (no Instant fee) unless Instant was requested.
  if (prefer !== 'instant' && standardAvailable > 0) {
    const standardResult = await attemptStandardPayout(
      connectedAccountId,
      targetAmountCents,
      standardAvailable,
      payoutMeta
    );
    if (standardResult.ok) return standardResult;
  }

  if (instantAvailable > 0 && canInstant) {
    const settledCap = standardAvailable > 0 ? standardAvailable : instantAvailable;
    const maxInstant = Math.min(
      targetAmountCents,
      instantNetAmount(settledCap),
      instantNetAmount(instantAvailable)
    );
    // Manual Instant cash out: only nudge down from max — never "succeed" with a tiny
    // $1/$10/$50 fallback that leaves most of the Connect balance behind.
    const candidates =
      prefer === 'instant'
        ? uniquePositiveAmounts([
            maxInstant,
            Math.floor(maxInstant * 0.99),
            Math.floor(maxInstant * 0.97),
            Math.floor(maxInstant * 0.95),
            Math.floor(maxInstant * 0.9),
          ])
        : uniquePositiveAmounts([
            maxInstant,
            Math.min(targetAmountCents, Math.floor(instantAvailable * 0.5)),
            Math.min(targetAmountCents, 5_000),
            Math.min(targetAmountCents, 1_000),
            Math.min(targetAmountCents, 100),
          ]);

    let lastInstantError = 'Instant payout failed';
    for (const amount of candidates) {
      const body: Record<string, unknown> = {
        amount,
        currency: 'usd',
        method: 'instant',
        metadata: payoutMeta,
      };
      if (instant?.destination) body.destination = instant.destination;
      try {
        const payout = await stripeConnectRequest('/payouts', 'POST', body, connectedAccountId);
        return { ok: true, payoutId: payout.id, method: 'instant', amountCents: amount };
      } catch (e) {
        lastInstantError = e instanceof Error ? e.message : 'Instant payout failed';
        if (!/insufficient/i.test(lastInstantError)) break;
      }
    }
    return { ok: false, error: friendlyPayoutError(lastInstantError), retryable: true };
  }

  if (instantAvailable > 0 && !canInstant) {
    if (standardAvailable <= 0) {
      return {
        ok: false,
        error:
          `$${(instantAvailable / 100).toFixed(2)} is on Connect but not settled for bank payout yet. Instant cash out needs a debit card in Stripe Express (Settings → Update payout setup). Or wait until funds move to available, then cash out to your bank.`,
        retryable: true,
      };
    }
  }

  const pending = usdEntry(balance.pending as BalanceEntry[] | undefined)?.amount ?? 0;
  if (pending > 0) {
    return {
      ok: false,
      error: `$${(pending / 100).toFixed(2)} is still settling on Connect (pending). Instant cash out needs payouts enabled + instant-eligible balance; finish ID verification in Settings if prompted, then retry shortly.`,
      retryable: true,
    };
  }

  return {
    ok: false,
    error: 'Funds not yet available on connected account balance',
    retryable: true,
  };
}

export function friendlyPayoutError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('payouts') && (m.includes('disabled') || m.includes('not enabled') || m.includes('capability'))) {
    return 'Stripe payouts are disabled until Express onboarding is finished. Settings → Update payout setup (upload photo ID).';
  }
  if (m.includes('verification') || m.includes('requirements')) {
    return 'Stripe needs more Express account info before cash out. Settings → Update payout setup.';
  }
  if (m.includes('instant') && (m.includes('destination') || m.includes('external account'))) {
    return 'Instant payout needs a debit card on your Stripe Express account. Re-open Connect in Settings and add an instant-eligible debit card (test: Stripe docs test debit numbers).';
  }
  if (m.includes('insufficient') || m.includes('card balance is too low')) {
    return 'Stripe could not Instant-payout that amount (often needs a debit card, or funds are still settling). Add a debit card in Settings, or wait for available balance and cash out to bank.';
  }
  return message;
}

async function attemptStandardPayout(
  connectedAccountId: string,
  targetAmountCents: number,
  standardAvailable: number,
  metadata: Record<string, string>,
  priorInstantError?: string
): Promise<InstantPayoutAttempt> {
  const amount = Math.min(targetAmountCents, standardAvailable);
  try {
    const payout = await stripeConnectRequest(
      '/payouts',
      'POST',
      {
        amount,
        currency: 'usd',
        method: 'standard',
        metadata,
      },
      connectedAccountId
    );
    return {
      ok: true,
      payoutId: payout.id,
      method: 'standard',
      amountCents: amount,
      error: priorInstantError ? `Instant unavailable: ${priorInstantError}` : undefined,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Standard payout failed';
    return { ok: false, error: message, retryable: true };
  }
}

/**
 * Manual cash out with an explicit method choice.
 * - instant: debit card, Stripe Instant fee applies, ~30 minutes
 * - standard: bank ACH, no Instant fee, typically ~2 business days
 */
export async function attemptCashOut(
  connectedAccountId: string,
  method: CashOutMethod
): Promise<InstantPayoutAttempt> {
  const blocked = await assertPayoutsEnabled(connectedAccountId);
  if (blocked) return { ok: false, error: blocked, retryable: true };

  const balance = await stripeConnectRequest('/balance', 'GET', undefined, connectedAccountId);
  const instant = usdEntry(balance.instant_available as BalanceEntry[] | undefined);
  const available = usdEntry(balance.available as BalanceEntry[] | undefined);
  const instantAvailable = instant?.amount ?? 0;
  const availableAmount = available?.amount ?? 0;
  const account = await loadConnectAccount(connectedAccountId);
  const canInstant = hasInstantDebitCard(account);
  const meta = { trigger: 'manual_cash_out', preferred_method: method };

  if (method === 'standard') {
    if (availableAmount <= 0) {
      return {
        ok: false,
        error:
          instantAvailable > 0
            ? `$${(instantAvailable / 100).toFixed(2)} is still settling. Standard (no fee) cash out needs settled available balance, or choose Instant with a debit card.`
            : 'No settled Connect balance for bank cash out yet.',
        retryable: true,
      };
    }
    return attemptStandardPayout(connectedAccountId, availableAmount, availableAmount, meta);
  }

  // Instant path
  if (!canInstant) {
    return {
      ok: false,
      error:
        'Instant cash out needs a debit card on your Stripe Express account. Settings → Update payout setup → add debit card. Or choose Standard (no fee, ~2 business days).',
      retryable: true,
    };
  }

  // Drain Instant-eligible balance in a few passes (fee buffer can leave a remainder).
  let paidTotal = 0;
  let lastPayoutId: string | undefined;
  let lastError = 'No Instant-eligible Connect balance yet.';

  for (let pass = 0; pass < 4; pass++) {
    const bal = await stripeConnectRequest('/balance', 'GET', undefined, connectedAccountId);
    const inst = usdEntry(bal.instant_available as BalanceEntry[] | undefined)?.amount ?? 0;
    const avail = usdEntry(bal.available as BalanceEntry[] | undefined)?.amount ?? 0;
    // Instant can draw on instant_available; cap by settled available when present.
    const pool = avail > 0 ? Math.min(inst > 0 ? inst : avail, avail) : inst;
    const target = instantNetAmount(pool);
    if (target < 100) break; // Instant fee / dust remainder

    const result = await attemptTechInstantPayout(connectedAccountId, target, {
      ...meta,
      drain_pass: String(pass + 1),
    }, { preferMethod: 'instant' });

    if (!result.ok) {
      lastError = result.error ?? lastError;
      if (paidTotal > 0) break;
      return result;
    }
    paidTotal += result.amountCents ?? 0;
    lastPayoutId = result.payoutId ?? lastPayoutId;
  }

  if (paidTotal <= 0) {
    return { ok: false, error: lastError, retryable: true };
  }

  return {
    ok: true,
    payoutId: lastPayoutId,
    method: 'instant',
    amountCents: paidTotal,
  };
}

/** @deprecated prefer attemptCashOut(accountId, method) */
export async function attemptFullBalanceInstantCashOut(
  connectedAccountId: string
): Promise<InstantPayoutAttempt> {
  const account = await loadConnectAccount(connectedAccountId);
  const method: CashOutMethod = hasInstantDebitCard(account) ? 'instant' : 'standard';
  return attemptCashOut(connectedAccountId, method);
}

export async function readConnectedBalanceCents(connectedAccountId: string) {
  const balance = await stripeConnectRequest('/balance', 'GET', undefined, connectedAccountId);
  const instant = usdEntry(balance.instant_available as BalanceEntry[] | undefined);
  const available = usdEntry(balance.available as BalanceEntry[] | undefined);
  const pending = usdEntry(balance.pending as BalanceEntry[] | undefined);
  const availableCents = available?.amount ?? 0;
  const pendingCents = pending?.amount ?? 0;
  const instantAvailableCents = instant?.amount ?? 0;

  let payoutsEnabled = true;
  let payoutBlockReason: string | null = null;
  let hasDebitCardForInstant = false;
  try {
    const account = await loadConnectAccount(connectedAccountId);
    hasDebitCardForInstant = hasInstantDebitCard(account);
    payoutBlockReason = account.payouts_enabled
      ? null
      : await assertPayoutsEnabled(connectedAccountId);
    payoutsEnabled = !payoutBlockReason;
  } catch {
    /* preview still useful without this */
  }

  const cashOutEligibleCents = hasDebitCardForInstant
    ? Math.max(instantAvailableCents, availableCents)
    : availableCents;

  return {
    instantAvailableCents,
    availableCents,
    pendingCents,
    connectTotalCents: availableCents + pendingCents,
    cashOutEligibleCents,
    payoutsEnabled,
    payoutBlockReason,
    hasDebitCardForInstant,
  };
}
