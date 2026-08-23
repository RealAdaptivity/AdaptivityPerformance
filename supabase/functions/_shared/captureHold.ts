import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { stripeRequest } from './stripe.ts';
import {
  resolveTechStripeAccountId,
  transferTechShareToConnect,
} from './connectTransfer.ts';

export type CaptureHoldResult = {
  capturedCents: number;
  remainderCents: number;
  remainderPaymentIntentId: string | null;
  transferId: string | null;
  transferError: string | null;
  techTransferCents: number;
  platformFeeCents: number;
  techStripeAccountId: string | null;
};

/**
 * Capture the booking hold (up to hold amount) and optionally charge any
 * remainder off-session with the saved payment method (repairs above diagnostic).
 */
export async function captureHoldAndRemainder(opts: {
  supabase: SupabaseClient;
  bookingId: string;
  bookingReference: string;
  mechanicId: string | null;
  paymentIntentId: string;
  holdCents: number;
  totalChargeCents: number;
  salesTaxCents?: number;
  source: string;
  /** Account credit to refund after capture; tech transfer uses net of this. */
  creditAppliedCents?: number;
}): Promise<CaptureHoldResult & { creditAppliedCents: number; creditRefundId: string | null }> {
  const chargeFromHold = Math.min(opts.holdCents, opts.totalChargeCents);
  const remainderCents = Math.max(0, opts.totalChargeCents - chargeFromHold);

  let pi = await stripeRequest(`/payment_intents/${opts.paymentIntentId}`, 'GET');
  if (pi.status === 'requires_capture') {
    pi = await stripeRequest(`/payment_intents/${opts.paymentIntentId}/capture`, 'POST', {
      amount_to_capture: chargeFromHold,
    });
  } else if (pi.status !== 'succeeded') {
    throw new Error(`Cannot capture hold (Stripe status: ${pi.status})`);
  }

  let capturedCents = (pi.amount_received as number) ?? chargeFromHold;
  let remainderPaymentIntentId: string | null = null;

  if (remainderCents > 0) {
    const paymentMethod =
      typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
    if (!paymentMethod) {
      throw new Error(
        'Quote total exceeds the card hold, but no saved payment method is available for the remainder.'
      );
    }

    let customerId: string | null =
      typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null;

    // If hold has no customer attached, create or resolve Stripe customer
    if (!customerId) {
      const { data: bookingRow } = await opts.supabase
        .from('bookings')
        .select('customer_name, customer_email, customer_phone')
        .or(`id.eq.${opts.bookingId},reference_code.ilike.${opts.bookingReference}`)
        .maybeSingle();

      const customerPayload: Record<string, unknown> = {
        metadata: {
          booking_id: opts.bookingId,
          booking_reference: opts.bookingReference,
        },
      };
      if (bookingRow?.customer_email) customerPayload.email = bookingRow.customer_email;
      else if (pi.receipt_email) customerPayload.email = pi.receipt_email;
      if (bookingRow?.customer_name) customerPayload.name = bookingRow.customer_name;
      if (bookingRow?.customer_phone) customerPayload.phone = bookingRow.customer_phone;

      try {
        const newCustomer = await stripeRequest('/customers', 'POST', customerPayload);
        customerId = newCustomer.id as string;
      } catch (custErr) {
        console.warn('[captureHold] customer creation error:', custErr);
      }
    }

    // Attach payment method to customer if available
    if (customerId) {
      try {
        await stripeRequest(`/payment_methods/${paymentMethod}/attach`, 'POST', {
          customer: customerId,
        });
      } catch (attachErr) {
        console.warn('[captureHold] payment method attach notice (may already be attached):', attachErr);
      }
    }

    const remainderBody: Record<string, unknown> = {
      amount: remainderCents,
      currency: 'usd',
      payment_method: paymentMethod,
      confirm: true,
      off_session: true,
      metadata: {
        type: 'quote_remainder',
        booking_reference: opts.bookingReference,
        booking_id: opts.bookingId,
        source: opts.source,
      },
    };
    if (customerId) {
      remainderBody.customer = customerId;
    }
    const remainderPi = await stripeRequest('/payment_intents', 'POST', remainderBody);
    if (remainderPi.status !== 'succeeded') {
      throw new Error(
        `Remainder charge failed (status: ${remainderPi.status}). Hold portion was captured — contact support.`
      );
    }
    remainderPaymentIntentId = remainderPi.id as string;
    capturedCents += remainderCents;
  }

  const creditAppliedCents = Math.max(
    0,
    Math.min(Math.round(opts.creditAppliedCents ?? 0), capturedCents)
  );
  let creditRefundId: string | null = null;
  if (creditAppliedCents > 0) {
    const chargeIdForRefund =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;
    if (chargeIdForRefund) {
      try {
        const refund = await stripeRequest('/refunds', 'POST', {
          charge: chargeIdForRefund,
          amount: creditAppliedCents,
          reason: 'requested_by_customer',
          metadata: {
            type: 'account_credit',
            booking_reference: opts.bookingReference,
            booking_id: opts.bookingId,
          },
        });
        creditRefundId = typeof refund.id === 'string' ? refund.id : null;
      } catch (e) {
        console.warn('[captureHold] credit refund failed', e);
      }
    }
  }

  const netForTransfer = Math.max(0, capturedCents - creditAppliedCents);

  const chargeId =
    typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;

  const { data: paymentRow } = await opts.supabase
    .from('payments')
    .select('stripe_transfer_id')
    .eq('payment_intent_id', opts.paymentIntentId)
    .maybeSingle();

  const techStripeAccountId = await resolveTechStripeAccountId(opts.supabase, opts.mechanicId);
  const transferResult = await transferTechShareToConnect({
    paymentIntentId: opts.paymentIntentId,
    bookingReference: opts.bookingReference,
    capturedCents: netForTransfer,
    salesTaxCents: opts.salesTaxCents,
    techStripeAccountId,
    chargeId,
    source: opts.source,
    existingTransferId:
      typeof paymentRow?.stripe_transfer_id === 'string' ? paymentRow.stripe_transfer_id : null,
  });

  await opts.supabase
    .from('payments')
    .update({
      status: 'succeeded',
      amount_cents: capturedCents,
      platform_fee_cents: transferResult.platformFeeCents,
      tech_transfer_cents: transferResult.techTransferCents,
      tech_stripe_account_id: transferResult.techStripeAccountId,
      stripe_transfer_id: transferResult.transferId,
      payout_status: transferResult.payoutStatus,
      payout_error: transferResult.transferError,
      updated_at: new Date().toISOString(),
    })
    .or(
      `payment_intent_id.eq.${opts.paymentIntentId},booking_reference.ilike.${opts.bookingReference},booking_id.eq.${opts.bookingId}`
    );

  return {
    capturedCents,
    remainderCents,
    remainderPaymentIntentId,
    transferId: transferResult.transferId,
    transferError: transferResult.transferError,
    techTransferCents: transferResult.techTransferCents,
    platformFeeCents: transferResult.platformFeeCents,
    techStripeAccountId: transferResult.techStripeAccountId,
    creditAppliedCents,
    creditRefundId,
  };
}
