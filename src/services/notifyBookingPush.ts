import { invokeEdgeFunction } from './edgeFunctionErrors';

/** Best-effort customer push via send-push edge (tokens from booking.customer_id). */
export async function notifyBookingPush(opts: {
  bookingReference: string;
  title: string;
  body: string;
}): Promise<void> {
  try {
    await invokeEdgeFunction('send-push', {
      bookingReference: opts.bookingReference,
      title: opts.title,
      body: opts.body,
    });
  } catch {
    /* optional — do not block status updates */
  }
}
