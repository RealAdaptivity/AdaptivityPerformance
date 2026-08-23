import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { splitJobTotalCents } from './revenueSplit.ts';
import { recoverConnectAccountForProfile } from './connectAccountRecovery.ts';
import { stripeRequest } from './stripe.ts';

export type ConnectTransferResult = {
  techStripeAccountId: string | null;
  techTransferCents: number;
  platformFeeCents: number;
  transferId: string | null;
  transferError: string | null;
  payoutStatus: string;
};

async function stripeAccountLive(accountId: string): Promise<boolean> {
  try {
    await stripeRequest(`/accounts/${accountId}`, 'GET');
    return true;
  } catch {
    return false;
  }
}

export async function resolveTechStripeAccountId(
  supabase: SupabaseClient,
  mechanicId: string | null | undefined,
  techEmail?: string | null
): Promise<string | null> {
  if (!mechanicId) return null;

  const { data: details } = await supabase
    .from('mechanic_details')
    .select('stripe_account_id')
    .eq('profile_id', mechanicId)
    .maybeSingle();

  const stored = details?.stripe_account_id;
  if (typeof stored === 'string' && stored.startsWith('acct_') && (await stripeAccountLive(stored))) {
    return stored;
  }

  if (typeof stored === 'string' && stored.startsWith('acct_')) {
    await supabase
      .from('mechanic_details')
      .update({ stripe_account_id: null })
      .eq('profile_id', mechanicId);
  }

  let email = techEmail?.trim() || '';
  if (!email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', mechanicId)
      .maybeSingle();
    email = (profile?.email as string | undefined)?.trim() || '';
  }

  if (!email) return null;

  const recovered = await recoverConnectAccountForProfile(mechanicId, email);
  if (!recovered?.startsWith('acct_') || !(await stripeAccountLive(recovered))) return null;

  await supabase.from('mechanic_details').upsert(
    { profile_id: mechanicId, stripe_account_id: recovered },
    { onConflict: 'profile_id' }
  );
  return recovered;
}

/**
 * Move the tech 70% share to their Connect account after capture.
 * Uses Stripe idempotency so retries (e.g. already-captured bookings) are safe.
 */
export async function transferTechShareToConnect(opts: {
  paymentIntentId: string;
  bookingReference: string;
  capturedCents: number;
  salesTaxCents?: number;
  techStripeAccountId: string | null;
  chargeId?: string | null;
  source?: string;
  existingTransferId?: string | null;
}): Promise<ConnectTransferResult> {
  const { platformFeeCents, techTransferCents } = splitJobTotalCents(
    opts.capturedCents,
    opts.salesTaxCents ?? 0
  );
  const techStripeAccountId = opts.techStripeAccountId;

  if (opts.existingTransferId) {
    return {
      techStripeAccountId,
      techTransferCents,
      platformFeeCents,
      transferId: opts.existingTransferId,
      transferError: null,
      payoutStatus: 'pending',
    };
  }

  if (!techStripeAccountId?.startsWith('acct_')) {
    return {
      techStripeAccountId,
      techTransferCents,
      platformFeeCents,
      transferId: null,
      transferError: 'Link Stripe Express in Settings before completing jobs.',
      payoutStatus: 'skipped',
    };
  }

  if (techTransferCents <= 0) {
    return {
      techStripeAccountId,
      techTransferCents,
      platformFeeCents,
      transferId: null,
      transferError: null,
      payoutStatus: 'skipped',
    };
  }

  const transferBody: Record<string, unknown> = {
    amount: techTransferCents,
    currency: 'usd',
    destination: techStripeAccountId,
    metadata: {
      booking_reference: opts.bookingReference,
      payment_intent_id: opts.paymentIntentId,
      tech_share: '70%',
      source: opts.source ?? 'job_capture',
    },
  };

  try {
    const key = Deno.env.get('STRIPE_SECRET_KEY')!;
    const init: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // Unique per request attempt so Stripe does not replay cached error responses
        'Idempotency-Key': `adaptivity_transfer_${opts.paymentIntentId}_${techStripeAccountId}_${Date.now()}`,
      },
      body: new URLSearchParams(
        flattenParams(transferBody) as Record<string, string>
      ).toString(),
    };
    const res = await fetch('https://api.stripe.com/v1/transfers', init);
    const data = await res.json();
    if (!res.ok) {
      const message = data.error?.message || `Stripe transfer failed (${res.status})`;
      return {
        techStripeAccountId,
        techTransferCents,
        platformFeeCents,
        transferId: null,
        transferError: friendlyTransferError(message),
        payoutStatus: 'retry_pending',
      };
    }
    return {
      techStripeAccountId,
      techTransferCents,
      platformFeeCents,
      transferId: data.id as string,
      transferError: null,
      payoutStatus: 'pending',
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Connect transfer failed';
    return {
      techStripeAccountId,
      techTransferCents,
      platformFeeCents,
      transferId: null,
      transferError: friendlyTransferError(message),
      payoutStatus: 'retry_pending',
    };
  }
}

export type ReverseTransferResult = {
  reversalId: string | null;
  reversedCents: number;
  error: string | null;
  payoutAlreadyCashedOut: boolean;
};

/**
 * Claw back tech Connect transfer after a customer refund.
 * Proportional to refundCents / capturedCents of the original tech share.
 */
export async function reverseConnectTransfer(opts: {
  transferId: string;
  capturedCents: number;
  refundCents: number;
  techTransferCents: number;
  bookingReference: string;
  forceAfterPayout?: boolean;
  payoutStatus?: string | null;
}): Promise<ReverseTransferResult> {
  const cashedOut = ['instant_paid', 'paid', 'instant_pending', 'standard_pending'].includes(
    opts.payoutStatus ?? ''
  );
  if (cashedOut && !opts.forceAfterPayout) {
    return {
      reversalId: null,
      reversedCents: 0,
      error:
        'Tech may have already cashed out this transfer. Pass forceAfterPayout=true to attempt Connect reversal anyway (may fail if balance is empty).',
      payoutAlreadyCashedOut: true,
    };
  }

  if (opts.capturedCents <= 0 || opts.techTransferCents <= 0 || opts.refundCents <= 0) {
    return {
      reversalId: null,
      reversedCents: 0,
      error: null,
      payoutAlreadyCashedOut: cashedOut,
    };
  }

  const reversedCents = Math.min(
    opts.techTransferCents,
    Math.round((opts.techTransferCents * opts.refundCents) / opts.capturedCents)
  );
  if (reversedCents <= 0) {
    return {
      reversalId: null,
      reversedCents: 0,
      error: null,
      payoutAlreadyCashedOut: cashedOut,
    };
  }

  try {
    const reversal = await stripeRequest(`/transfers/${opts.transferId}/reversals`, 'POST', {
      amount: reversedCents,
      metadata: {
        booking_reference: opts.bookingReference,
        source: 'admin_refund',
      },
    });
    return {
      reversalId: reversal.id as string,
      reversedCents,
      error: null,
      payoutAlreadyCashedOut: cashedOut,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Transfer reversal failed';
    return {
      reversalId: null,
      reversedCents,
      error: message,
      payoutAlreadyCashedOut: cashedOut,
    };
  }
}

function friendlyTransferError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes('capabilities enabled') &&
    (m.includes('transfers') || m.includes('legacy_payments'))
  ) {
    return 'Finish Stripe Express in Settings (Update payout setup) until identity and payout details are complete — Stripe must activate Transfers before job payouts can land on your balance.';
  }
  return message;
}

function flattenParams(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenParams(value as Record<string, unknown>, fullKey));
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}
