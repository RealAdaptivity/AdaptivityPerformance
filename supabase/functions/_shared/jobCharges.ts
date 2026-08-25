import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { refundCapture } from './paypal.ts';
import { splitJobTotalCents } from './revenueSplit.ts';

export type JobChargeResult = {
  /** Deposit collected at booking, net of any refund issued here. */
  collectedCents: number;
  /** Still owed by the customer. Collected afterwards by payment link. */
  balanceDueCents: number;
  refundId: string | null;
  refundedCents: number;
  techTransferCents: number;
  platformFeeCents: number;
  payoutId: string | null;
  payoutError: string | null;
  creditAppliedCents: number;
};

/**
 * Settle a completed job against the deposit already collected at booking.
 *
 * This replaces the old capture-the-hold-then-charge-the-remainder flow. The
 * deposit is real money taken up front rather than an authorization, so there is
 * nothing to capture here and no vaulted card to bill. Only two things can
 * happen: the job came in under the deposit and the difference goes back, or it
 * came in over and the balance is collected afterwards by payment link.
 *
 * The tech's share accrues on what has actually been collected, not on the job
 * total. Accruing the full share before the customer has paid the balance would
 * put the business on the hook for money it has not received; the balance
 * payment tops the accrual up when it lands.
 */
export async function finalizeJobCharges(opts: {
  supabase: SupabaseClient;
  bookingId: string;
  bookingReference: string;
  mechanicId: string | null;
  /** PayPal capture id for the deposit taken at booking. */
  depositCaptureId: string | null;
  depositCents: number;
  totalChargeCents: number;
  salesTaxCents?: number;
  partsCents?: number;
  partsPurchasedBy?: 'tech' | 'company';
  source: string;
  /** Account credit to return to the customer on top of any overpayment. */
  creditAppliedCents?: number;
}): Promise<JobChargeResult> {
  const depositCents = Math.max(0, Math.round(opts.depositCents));
  const totalCents = Math.max(0, Math.round(opts.totalChargeCents));

  // Anything the job came in under the deposit goes back, as does any account
  // credit applied. Both are refunds against the deposit capture.
  const overpaidCents = Math.max(0, depositCents - totalCents);
  const creditAppliedCents = Math.max(
    0,
    Math.min(Math.round(opts.creditAppliedCents ?? 0), Math.max(0, depositCents - overpaidCents))
  );
  const refundTargetCents = overpaidCents + creditAppliedCents;

  let refundId: string | null = null;
  let refundedCents = 0;

  if (refundTargetCents > 0) {
    if (!opts.depositCaptureId) {
      // Nothing to refund against. Not fatal -- the job is still complete -- but
      // an admin has to return this by hand, so it must not pass silently.
      console.error(
        `[jobCharges] ${opts.bookingReference}: owe customer $${(refundTargetCents / 100).toFixed(2)} but no deposit capture id is recorded.`
      );
    } else {
      try {
        const refund = await refundCapture({
          captureId: opts.depositCaptureId,
          amountCents: refundTargetCents,
          invoiceId: opts.bookingReference,
          idempotencyKey: `rfnd-${opts.bookingId}-${refundTargetCents}`.slice(0, 38),
        });
        refundId = refund.refundId;
        refundedCents = refundTargetCents;
      } catch (e) {
        // The customer keeps their money either way; surface it for reconciliation.
        console.error('[jobCharges] refund failed', e);
      }
    }
  }

  const collectedCents = Math.max(0, depositCents - refundedCents);
  const balanceDueCents = Math.max(0, totalCents - depositCents);

  // Split on what is actually in hand.
  const split = splitJobTotalCents(
    collectedCents,
    opts.salesTaxCents ?? 0,
    opts.partsCents ?? 0,
    opts.partsPurchasedBy ?? 'tech'
  );

  let payoutId: string | null = null;
  let payoutError: string | null = null;
  if (opts.mechanicId && split.techTransferCents > 0) {
    const { data: payoutRow, error } = await opts.supabase
      .from('tech_payouts')
      .upsert(
        {
          booking_id: opts.bookingId,
          booking_reference: opts.bookingReference,
          mechanic_id: opts.mechanicId,
          amount_cents: split.techTransferCents,
          status: 'accrued',
          notes:
            balanceDueCents > 0
              ? `Accrued on deposit; tops up when the $${(balanceDueCents / 100).toFixed(2)} balance is paid`
              : `Captured via ${opts.source}`,
        },
        { onConflict: 'booking_id' }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      // The customer has already paid; a ledger failure must never fail the job.
      payoutError = error.message;
      console.error('[jobCharges] tech_payouts upsert failed', error.message);
    } else {
      payoutId = (payoutRow?.id as string) ?? null;
    }
  } else if (!opts.mechanicId) {
    payoutError = 'No technician assigned to this booking; nothing accrued.';
  }

  await opts.supabase
    .from('payments')
    .update({
      processor: 'paypal',
      status: balanceDueCents > 0 ? 'balance_due' : 'succeeded',
      amount_cents: collectedCents,
      paypal_refund_id: refundId,
      platform_fee_cents: split.platformFeeCents,
      tech_transfer_cents: split.techTransferCents,
      payout_status: payoutId ? 'accrued' : 'none',
      payout_error: payoutError,
      updated_at: new Date().toISOString(),
    })
    .or(`booking_id.eq.${opts.bookingId},booking_reference.ilike.${opts.bookingReference}`);

  return {
    collectedCents,
    balanceDueCents,
    refundId,
    refundedCents,
    techTransferCents: split.techTransferCents,
    platformFeeCents: split.platformFeeCents,
    payoutId,
    payoutError,
    creditAppliedCents,
  };
}
