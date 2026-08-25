import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { reverseHelcimPreauth, isHelcimApproved } from './helcim.ts';

/**
 * Release an uncaptured card hold.
 *
 * Helcim calls this a reverse; it is the analogue of cancelling a Stripe
 * PaymentIntent still sitting in requires_capture. Two cases that Stripe folded
 * into its status machine have to be handled explicitly here:
 *
 *   - No hold exists yet. create-booking-with-hold issues a checkout token
 *     before the customer enters a card, so a booking abandoned at that step has
 *     no transaction to reverse. Cancelling it is bookkeeping only.
 *
 *   - The authorization already settled. A reverse only works while funds are
 *     still held. Once settled the money has moved and releasing it is a refund,
 *     not a reversal, so this fails loudly rather than marking the booking
 *     cancelled while the customer is still out the money.
 */
export async function cancelBookingHoldForRow(
  supabase: SupabaseClient,
  booking: {
    id: string;
    reference_code: string;
    helcim_transaction_id: string | null;
    payment_status: string | null;
  },
  options: { releaseJob: boolean }
) {
  if (booking.payment_status === 'captured') {
    throw new Error('Payment already captured; use refund instead.');
  }

  let processorStatus: string | null = null;
  const transactionId = booking.helcim_transaction_id;

  if (transactionId) {
    try {
      const reversal = await reverseHelcimPreauth({
        cardTransactionId: transactionId,
        idempotencySeed: `rev_${booking.id}`,
      });
      processorStatus = isHelcimApproved(reversal.status) ? 'reversed' : reversal.status;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Treat an already-reversed hold as success so a retried cancellation is
      // idempotent, but let anything else surface -- silently cancelling a
      // booking whose hold is still live would strand the customer's funds.
      if (/already\s+(been\s+)?(reversed|voided)|not\s+found/i.test(message)) {
        processorStatus = 'reversed';
      } else {
        throw new Error(`Could not release the card hold: ${message}`);
      }
    }
  } else {
    processorStatus = 'no_hold';
  }

  const bookingPatch: Record<string, unknown> = {
    payment_status: 'canceled',
  };

  if (options.releaseJob) {
    bookingPatch.status = 'CANCELED';
    bookingPatch.mechanic_id = null;
    bookingPatch.eta_minutes = 0;
    bookingPatch.distance_miles = 0;
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(bookingPatch)
    .eq('id', booking.id);
  if (updateError) throw new Error(updateError.message);

  await supabase
    .from('payments')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('booking_id', booking.id);

  return { processorStatus, bookingReference: booking.reference_code };
}
