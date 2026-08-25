import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  captureAuthorization,
  chargeVaultedCard,
  refundCapture,
  isPayPalOk,
} from './paypal.ts';
import { splitJobTotalCents } from './revenueSplit.ts';

export type CaptureHoldResult = {
  capturedCents: number;
  remainderCents: number;
  captureId: string | null;
  remainderCaptureId: string | null;
  techTransferCents: number;
  platformFeeCents: number;
  payoutId: string | null;
  payoutError: string | null;
};

/**
 * Capture the booking hold and charge any repair total above it.
 *
 * Two things differ from the Stripe implementation this replaces.
 *
 * The remainder. Stripe re-confirmed a second PaymentIntent off_session against
 * the saved payment method. PayPal's equivalent is a fresh order charged against
 * the vault id captured when the hold was authorized. Without that vault id
 * there is no way to bill the repair without re-collecting the card, so its
 * absence is a hard error raised before any money moves — capturing first would
 * leave the job half-paid with no way to finish collecting.
 *
 * The payout. The Connect platform is gone, so the tech's share is no longer
 * transferred on the spot; it is recorded in tech_payouts as an obligation and
 * settled in a batch. The split itself is unchanged: splitJobTotalCents still
 * decides it, and still routes sales tax entirely to the platform.
 */
export async function captureHoldAndRemainder(opts: {
  supabase: SupabaseClient;
  bookingId: string;
  bookingReference: string;
  mechanicId: string | null;
  /** PayPal authorization from the booking hold. */
  authorizationId: string;
  /** Vaulted card, required only when the total exceeds the hold. */
  vaultId: string | null;
  holdCents: number;
  totalChargeCents: number;
  salesTaxCents?: number;
  partsCents?: number;
  partsPurchasedBy?: 'tech' | 'company';
  source: string;
  /** Account credit refunded after capture; the payout is net of it. */
  creditAppliedCents?: number;
}): Promise<CaptureHoldResult & { creditAppliedCents: number; creditRefundId: string | null }> {
  const chargeFromHold = Math.min(opts.holdCents, opts.totalChargeCents);
  const remainderCents = Math.max(0, opts.totalChargeCents - chargeFromHold);

  // Fail before taking any money if the repair exceeds the hold and there is no
  // card on file to cover the difference.
  if (remainderCents > 0 && !opts.vaultId) {
    throw new Error(
      'Job total exceeds the card hold, but no saved card is available for the remainder. Ask the customer to pay the balance through a payment link.'
    );
  }

  // final_capture releases any authorized-but-uncaptured portion back to the
  // customer rather than leaving it pending on their card.
  const capture = await captureAuthorization({
    authorizationId: opts.authorizationId,
    amountCents: chargeFromHold,
    invoiceId: opts.bookingReference,
    finalCapture: true,
    idempotencyKey: `cap-${opts.bookingId}`,
  });
  if (!isPayPalOk(capture.status)) {
    throw new Error(`Could not capture the card hold (PayPal status: ${capture.status}).`);
  }

  let capturedCents = capture.amountCents || chargeFromHold;
  let remainderCaptureId: string | null = null;

  if (remainderCents > 0) {
    const remainder = await chargeVaultedCard({
      vaultId: opts.vaultId!,
      amountCents: remainderCents,
      invoiceId: opts.bookingReference,
      description: `Repair balance — ${opts.bookingReference}`,
      idempotencyKey: `rem-${opts.bookingId}`,
    });
    if (!isPayPalOk(remainder.status)) {
      // The hold portion is already captured and stays captured; surfacing this
      // as an error routes it to the admin rather than silently under-collecting.
      throw new Error(
        `Remainder charge declined (PayPal status: ${remainder.status}). The $${(chargeFromHold / 100).toFixed(2)} hold portion was captured — collect the balance by payment link.`
      );
    }
    remainderCaptureId = remainder.captureId;
    capturedCents += remainder.amountCents || remainderCents;
  }

  // Account credit is returned against the capture, so it reduces what the job
  // actually collected and therefore what the tech is owed.
  const creditAppliedCents = Math.max(
    0,
    Math.min(Math.round(opts.creditAppliedCents ?? 0), capturedCents)
  );
  let creditRefundId: string | null = null;
  if (creditAppliedCents > 0) {
    try {
      const refund = await refundCapture({
        captureId: capture.captureId,
        amountCents: creditAppliedCents,
        invoiceId: opts.bookingReference,
        idempotencyKey: `crd-${opts.bookingId}`,
      });
      creditRefundId = refund.refundId;
    } catch (e) {
      console.warn('[captureHold] credit refund failed', e);
    }
  }

  const netForTransfer = Math.max(0, capturedCents - creditAppliedCents);
  const split = splitJobTotalCents(
    netForTransfer,
    opts.salesTaxCents ?? 0,
    opts.partsCents ?? 0,
    opts.partsPurchasedBy ?? 'tech'
  );

  // Record what the tech earned. Unique on booking_id, so a retried capture
  // reuses the existing row instead of accruing the job twice.
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
          notes: `Captured via ${opts.source}`,
        },
        { onConflict: 'booking_id' }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      // The customer has already paid at this point, so a ledger failure must not
      // fail the capture. Surface it instead: the admin reconciles from PayPal.
      payoutError = error.message;
      console.error('[captureHold] tech_payouts upsert failed', error.message);
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
      status: 'succeeded',
      amount_cents: capturedCents,
      paypal_capture_id: capture.captureId,
      paypal_remainder_capture_id: remainderCaptureId,
      paypal_refund_id: creditRefundId,
      platform_fee_cents: split.platformFeeCents,
      tech_transfer_cents: split.techTransferCents,
      payout_status: payoutId ? 'accrued' : 'none',
      payout_error: payoutError,
      updated_at: new Date().toISOString(),
    })
    .or(`booking_id.eq.${opts.bookingId},booking_reference.ilike.${opts.bookingReference}`);

  return {
    capturedCents,
    remainderCents,
    captureId: capture.captureId,
    remainderCaptureId,
    techTransferCents: split.techTransferCents,
    platformFeeCents: split.platformFeeCents,
    payoutId,
    payoutError,
    creditAppliedCents,
    creditRefundId,
  };
}
