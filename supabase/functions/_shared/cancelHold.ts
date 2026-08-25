import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { refundCapture } from './paypal.ts';

/**
 * Cancel a booking and return the diagnostic deposit.
 *
 * Under the old hold model this voided an authorization, which released
 * reserved funds. The deposit is now real money already collected, so
 * cancelling means refunding it — a slower thing for the customer to see, but a
 * far simpler thing to get right: there is no honor period, nothing expires, and
 * a refund cannot silently fail the way a void on a lapsed authorization could.
 */
export async function cancelBookingHoldForRow(
  supabase: SupabaseClient,
  booking: {
    id: string;
    reference_code: string;
    paypal_capture_id: string | null;
    payment_status: string | null;
    hold_amount_cents?: number | null;
  },
  options: { releaseJob: boolean }
) {
  if (booking.payment_status === 'captured') {
    throw new Error('Job already settled; use refund instead.');
  }

  let processorStatus: string | null = null;
  const captureId = booking.paypal_capture_id;

  if (captureId) {
    try {
      // Omitting the amount refunds the capture in full, which is what a
      // cancellation owes: the customer paid a deposit for a visit that is not
      // happening.
      await refundCapture({
        captureId,
        invoiceId: booking.reference_code,
        idempotencyKey: `cancel-${booking.id}`.slice(0, 38),
      });
      processorStatus = 'refunded';
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Already fully refunded is the state we wanted, so a retried cancellation
      // stays idempotent. Anything else must surface — marking a booking
      // cancelled while the customer is still out the deposit is how chargebacks
      // start.
      if (/CAPTURE_FULLY_REFUNDED|ALREADY_REFUNDED|RESOURCE_NOT_FOUND/i.test(message)) {
        processorStatus = 'refunded';
      } else {
        throw new Error(`Could not refund the deposit: ${message}`);
      }
    }
  } else {
    // The customer never completed payment, so there is nothing to return.
    processorStatus = 'no_deposit';
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
