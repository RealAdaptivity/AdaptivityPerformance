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
  /** Composed from the parts below by the form, and recomposed server-side.
   *  bookings.vehicle_description is NOT NULL and the tech portal, receipts
   *  and the confirmation text all read it. */
  vehicleDescription: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string;
  vehicleEngine?: string;
  /** What the customer says is wrong. Separate from customerNotes, which is
   *  parking and access detail. */
  issueDescription?: string;
  /** Paths inside the private booking-media bucket. Optional: uploading is
   *  never a condition of booking. */
  mediaPaths?: string[];
  vin?: string;
  services: string[];
  locationType: 'mobile' | 'shop';
  partnerLocationId?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  customerNotes?: string;
  referralCode?: string;
  preferredMechanicId?: string;
  /** An admin booking a visit for a caller from the dispatch board. The
   *  server checks the caller is an admin, leaves the booking unowned (it
   *  belongs to the caller, not the admin) and records who took the call. */
  phoneBooking?: boolean;
}): Promise<BookingRequestResult> {
  const data = await invokeEdgeFunction<BookingRequestResult>('create-booking-request', params);
  if (!data?.bookingReference) throw new Error('Booking reference missing from server response');
  return data;
}
