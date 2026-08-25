import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { stripeRequest } from './stripe.ts';

export async function cancelBookingHoldForRow(
  supabase: SupabaseClient,
  booking: {
    id: string;
    reference_code: string;
    payment_intent_id: string | null;
    payment_status: string | null;
  },
  options: { releaseJob: boolean }
) {
  if (booking.payment_status === 'captured') {
    throw new Error('Payment already captured; use refund instead.');
  }

  let stripeStatus: string | null = null;
  const paymentIntentId = booking.payment_intent_id;

  if (paymentIntentId) {
    const pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');
    stripeStatus = pi.status as string;

    if (pi.status === 'requires_capture' || pi.status === 'requires_confirmation') {
      await stripeRequest(`/payment_intents/${paymentIntentId}/cancel`, 'POST');
      stripeStatus = 'canceled';
    } else if (pi.status === 'canceled') {
      stripeStatus = 'canceled';
    } else if (
      pi.status !== 'requires_payment_method' &&
      pi.status !== 'requires_action' &&
      pi.status !== 'succeeded'
    ) {
      throw new Error(`Cannot cancel hold (Stripe status: ${pi.status}).`);
    }
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

  const { error: updateError } = await supabase.from('bookings').update(bookingPatch).eq('id', booking.id);
  if (updateError) throw new Error(updateError.message);

  if (paymentIntentId) {
    await supabase
      .from('payments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('payment_intent_id', paymentIntentId);
  }

  return { stripeStatus, bookingReference: booking.reference_code };
}
