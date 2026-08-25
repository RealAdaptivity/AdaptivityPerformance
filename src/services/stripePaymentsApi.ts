import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  totalCharged: number;
  baseAmount?: number;
  techShareAmount: number;
  platformShareAmount: number;
  // Present only for payment-link checkouts (customer not logged in).
  customerName?: string;
  services?: string[];
  bookingReference?: string;
}

export async function createCheckoutPaymentIntent(params: {
  baseAmountDollars?: number;
  tipAmountDollars?: number;
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  techStripeAccountId?: string | null;
  bookingReference?: string;
  preferFinancing?: boolean;
  // When set, the server derives the amount and tech account from the stored
  // booking; baseAmountDollars/techStripeAccountId from the client are ignored.
  paymentLinkReference?: string;
}): Promise<CreatePaymentIntentResult> {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'Failed to start checkout');
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  if (!data?.clientSecret) {
    throw new Error('Stripe client secret missing from server response');
  }
  return data as CreatePaymentIntentResult;
}

export async function startMechanicStripeOnboarding(params: {
  techName: string;
  techEmail: string;
  profileId?: string;
  returnUrl?: string;
  refreshUrl?: string;
}) {
  const { data, error } = await supabase.functions.invoke('create-connect-account', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as { accountId: string; onboardingUrl: string };
}

export type BookingHoldResult = {
  bookingReference: string;
  bookingId: string;
  /** PayPal order id. Replaces the Stripe clientSecret. */
  orderId: string;
  holdAmountDollars: number;
  message: string;
};

export async function createBookingWithCardHold(params: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  zipCode: string;
  vehicleDescription: string;
  vin?: string;
  services: string[];
  holdAmountDollars: number;
  locationType: 'mobile' | 'shop';
  partnerLocationId?: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  customerNotes?: string;
  referralCode?: string;
  preferredMechanicId?: string;
}): Promise<BookingHoldResult> {
  const data = await invokeEdgeFunction<BookingHoldResult>('create-booking-with-hold', params);
  if (!data?.orderId) throw new Error('Missing card authorization order from server');
  return data;
}

export type ConfirmBookingHoldResult = {
  ok: boolean;
  bookingReference: string;
  authorizationId?: string;
  authorizedAmountDollars?: number;
  /** False when PayPal returned no vault id, meaning a repair above the hold
   * cannot be charged without re-collecting the card. */
  cardOnFile?: boolean;
  /** When PayPal stops guaranteeing the funds (~3 days out). */
  authorizationExpiresAt?: string | null;
  alreadyConfirmed?: boolean;
};

/**
 * Place the hold once the buyer approves the order in the browser.
 *
 * PayPal splits approval from authorization: approving an order reserves
 * nothing, and only this server-side call actually holds the funds. The order id
 * was minted server-side, so it is verified against the booking rather than
 * trusted.
 */
export async function confirmBookingHold(params: {
  bookingReference: string;
  orderId: string;
}): Promise<ConfirmBookingHoldResult> {
  return invokeEdgeFunction<ConfirmBookingHoldResult>('confirm-booking-hold', params);
}
