import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { voidAuthorization } from './paypal.ts';

/**
 * Release an uncaptured card hold.
 *
 * PayPal calls this voiding an authorization; it is the analogue of cancelling a
 * Stripe PaymentIntent still in requires_capture. Two cases Stripe folded into
 * its status machine have to be handled explicitly here:
 *
 *   - No hold exists yet. create-booking-with-hold opens an order before the
 *     customer enters a card, so a booking abandoned at that step has no
 *     authorization to void. Cancelling it is bookkeeping only.
 *
 *   - The authorization already expired. PayPal releases the funds itself after
 *     the honor period, so a void on an expired authorization fails — but the
 *     customer's money is already free, which is the outcome we wanted. That is
 *     treated as success rather than blocking the cancellation.
 */
export async function cancelBookingHoldForRow(
  supabase: SupabaseClient,
  booking: {
    id: string;
    reference_code: string;
    paypal_authorization_id: string | null;
    payment_status: string | null;
  },
  options: { releaseJob: boolean }
) {
  if (booking.payment_status === 'captured') {
    throw new Error('Payment already captured; use refund instead.');
  }

  let processorStatus: string | null = null;
  const authorizationId = booking.paypal_authorization_id;

  if (authorizationId) {
    try {
      await voidAuthorization(authorizationId);
      processorStatus = 'voided';
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // An authorization that is already voided, already captured-and-settled,
      // or expired past its honor period leaves nothing held. Treat those as
      // done so a retried cancellation stays idempotent; anything else must
      // surface, because silently cancelling a booking whose hold is still live
      // would strand the customer's funds.
      if (
        /ALREADY_VOIDED|AUTHORIZATION_VOIDED|RESOURCE_NOT_FOUND|AUTHORIZATION_EXPIRED|INVALID_RESOURCE_ID/i.test(
          message
        )
      ) {
        processorStatus = 'voided';
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
