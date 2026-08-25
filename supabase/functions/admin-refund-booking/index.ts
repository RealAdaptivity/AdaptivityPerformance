import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  refundHelcimTransaction,
  isHelcimApproved,
  centsToAmount,
} from './_shared/helcim.ts';
import { requireAdminUser } from './_shared/adminAuth.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const admin = await requireAdminUser(req);
    if (!admin.ok) return admin.response;

    const { bookingReference, refundAmountDollars, reason, forceAfterPayout } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference_code, processor, payment_status, captured_amount_cents')
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.payment_status !== 'captured' && booking.payment_status !== 'partially_refunded') {
      return jsonResponse({ error: 'Refund only applies after payment is captured' }, 400);
    }

    // Jobs paid before the cutover were captured on Stripe, whose account is
    // closed. There is no API path to refund those, so say so plainly rather
    // than failing with a confusing processor error.
    if (booking.processor === 'stripe') {
      return jsonResponse(
        {
          error:
            'This job was paid through Stripe, which is no longer reachable. Refund it manually (bank transfer or cash) and record it outside the app.',
          processor: 'stripe',
        },
        409
      );
    }

    const { data: paymentRow } = await supabase
      .from('payments')
      .select(
        'id, helcim_capture_transaction_id, helcim_remainder_transaction_id, helcim_refund_transaction_id, tech_transfer_cents, amount_cents, payout_status'
      )
      .eq('booking_id', booking.id)
      .maybeSingle();

    // A capture and a repair remainder are separate Helcim transactions, so a
    // refund larger than the hold has to be drawn from both. Ordered largest
    // first so a typical refund resolves in a single call.
    const sources = [
      paymentRow?.helcim_remainder_transaction_id
        ? {
            id: paymentRow.helcim_remainder_transaction_id as string,
            cents: Math.max(0, Number(paymentRow.amount_cents ?? 0) - Number(booking.captured_amount_cents ?? 0)),
          }
        : null,
      paymentRow?.helcim_capture_transaction_id
        ? {
            id: paymentRow.helcim_capture_transaction_id as string,
            cents: Number(booking.captured_amount_cents ?? paymentRow?.amount_cents ?? 0),
          }
        : null,
    ].filter(Boolean) as Array<{ id: string; cents: number }>;

    if (sources.length === 0) {
      return jsonResponse({ error: 'No Helcim transaction found to refund' }, 400);
    }

    const maxCents = Number(booking.captured_amount_cents ?? paymentRow?.amount_cents ?? 0);
    let refundCents = maxCents;
    if (refundAmountDollars !== undefined && refundAmountDollars !== null && refundAmountDollars !== '') {
      refundCents = Math.round(Number(refundAmountDollars) * 100);
      if (!Number.isFinite(refundCents) || refundCents <= 0) {
        return jsonResponse({ error: 'Invalid refundAmountDollars' }, 400);
      }
      if (refundCents > maxCents) {
        return jsonResponse({ error: 'Refund exceeds captured amount' }, 400);
      }
    }

    // Claw back the tech's share before refunding the customer.
    //
    // This is where the ledger beats Connect. A transfer already sent had to be
    // reversed on Stripe's side and could fail if the tech had cashed out; an
    // accrual that has not been settled is just a number we can reduce. Only a
    // payout already sent out the door needs a human.
    const techCents = Number(paymentRow?.tech_transfer_cents ?? 0);
    const reverseTechCents =
      maxCents > 0 && techCents > 0
        ? Math.min(techCents, Math.round((techCents * refundCents) / maxCents))
        : 0;

    let payoutWarning: string | null = null;
    let reversedTechCents = 0;

    if (reverseTechCents > 0) {
      const { data: payout } = await supabase
        .from('tech_payouts')
        .select('id, amount_cents, status')
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (payout) {
        if (payout.status === 'paid') {
          if (forceAfterPayout !== true) {
            return jsonResponse(
              {
                error: `The technician has already been paid $${(Number(payout.amount_cents) / 100).toFixed(2)} for this job. Recover it from them directly, then retry with forceAfterPayout to refund the customer anyway.`,
                requiresForceAfterPayout: true,
                payoutId: payout.id,
              },
              409
            );
          }
          payoutWarning = `Technician was already paid $${(Number(payout.amount_cents) / 100).toFixed(2)}; recover it manually.`;
        } else {
          const remaining = Math.max(0, Number(payout.amount_cents) - reverseTechCents);
          const { error: payoutError } = await supabase
            .from('tech_payouts')
            .update({
              amount_cents: remaining,
              status: remaining === 0 ? 'void' : payout.status,
              notes: `Reduced by refund of $${(refundCents / 100).toFixed(2)}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payout.id);
          if (payoutError) payoutWarning = payoutError.message;
          else reversedTechCents = reverseTechCents;
        }
      }
    }

    // Draw the refund from each transaction in turn until satisfied.
    let remainingToRefund = refundCents;
    const refundIds: string[] = [];
    for (const source of sources) {
      if (remainingToRefund <= 0) break;
      const slice = Math.min(remainingToRefund, source.cents);
      if (slice <= 0) continue;

      const result = await refundHelcimTransaction({
        originalTransactionId: source.id,
        amount: centsToAmount(slice),
        idempotencySeed: `rfnd_${booking.id}_${source.id}_${slice}`,
      });
      if (!isHelcimApproved(result.status)) {
        return jsonResponse(
          {
            error: `Refund declined by Helcim (status: ${result.status}). ${refundIds.length > 0 ? `Partial refunds already issued: ${refundIds.join(', ')}.` : ''}`,
            refundIds,
          },
          400
        );
      }
      refundIds.push(result.transactionId);
      remainingToRefund -= slice;
    }

    if (remainingToRefund > 0) {
      return jsonResponse(
        {
          error: `Only $${((refundCents - remainingToRefund) / 100).toFixed(2)} of $${(refundCents / 100).toFixed(2)} could be refunded from the recorded transactions.`,
          refundIds,
        },
        400
      );
    }

    const fullyRefunded = refundCents >= maxCents;
    const paymentStatus = fullyRefunded ? 'refunded' : 'partially_refunded';
    const now = new Date().toISOString();

    await supabase
      .from('bookings')
      .update({ payment_status: paymentStatus, updated_at: now })
      .eq('id', booking.id);

    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        helcim_refund_transaction_id: refundIds[0] ?? null,
        payout_status: reversedTechCents > 0 ? (fullyRefunded ? 'reversed' : 'partially_reversed') : paymentRow?.payout_status ?? 'none',
        payout_error: payoutWarning,
        updated_at: now,
      })
      .eq('booking_id', booking.id);

    return jsonResponse({
      ok: true,
      bookingReference: booking.reference_code,
      refundIds,
      refundAmountDollars: refundCents / 100,
      fullyRefunded,
      reversedTechDollars: reversedTechCents / 100,
      reason: reason ?? 'requested_by_customer',
      payoutWarning,
    });
  } catch (err) {
    console.error('[admin-refund-booking]', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Refund failed' }, 500);
  }
});
