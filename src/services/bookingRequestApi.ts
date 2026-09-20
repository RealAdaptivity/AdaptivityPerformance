import { invokeEdgeFunction } from './edgeFunctionErrors';

/** Replaces stripePaymentsApi. Booking no longer takes a card: the request is
 *  recorded, the technician comes out, and payment is taken in person on
 *  Square. Nothing in the browser touches a payment processor. */
export type BookingRequestResult = {
  bookingReference: string;
  bookingId: string;
  quotedAmountDollars: number;
  quoteMode: 'diagnostic' | 'direct';
  message: string;
};

export async function createBookingRequest(params: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  zipCode: string;
  vehicleDescription: string;
  vin?: string;
  services: string[];
  locationType: 'mobile' | 'shop';
  partnerLocationId?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  customerNotes?: string;
  referralCode?: string;
  preferredMechanicId?: string;
}): Promise<BookingRequestResult> {
  const data = await invokeEdgeFunction<BookingRequestResult>('create-booking-request', params);
  if (!data?.bookingReference) throw new Error('Booking reference missing from server response');
  return data;
}
