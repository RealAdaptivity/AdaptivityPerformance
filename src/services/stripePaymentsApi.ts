import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

export interface CreatePaymentIntentResult {
  /** HelcimPay.js session token. Replaces the Stripe clientSecret. */
  checkoutToken: string;
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
  if (!data?.checkoutToken) {
    throw new Error('Checkout session missing from server response');
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
  /** HelcimPay.js session token. Replaces the Stripe clientSecret. */
  checkoutToken: string;
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
  if (!data?.checkoutToken) throw new Error('Missing card authorization session from server');
  return data;
}

export type ConfirmBookingHoldResult = {
  ok: boolean;
  bookingReference: string;
  transactionId?: string;
  authorizedAmountDollars?: number;
  /** False when Helcim returned no reusable card token, which means a repair
   * above the hold cannot be charged without re-collecting the card. */
  cardOnFile?: boolean;
  alreadyConfirmed?: boolean;
};

/**
 * Record the hold after the customer completes the HelcimPay.js modal.
 *
 * The transaction id comes from the browser, so the server re-fetches it from
 * Helcim and validates approval, amount, and prior use before storing anything.
 * This call is what actually attaches the hold to the booking -- until it
 * succeeds, the booking has a checkout session but no card.
 */
export type ConfirmCheckoutResult = {
  ok: boolean;
  bookingReference: string | null;
  transactionId?: string;
  paidAmountDollars?: number;
  alreadyConfirmed?: boolean;
};

/**
 * Record a completed checkout after the HelcimPay.js modal closes.
 *
 * As with the hold, the transaction id comes from the browser and is
 * revalidated server-side against Helcim before the payment is marked paid.
 */
export async function confirmCheckoutPayment(params: {
  checkoutToken: string;
  transactionId: string;
}): Promise<ConfirmCheckoutResult> {
  return invokeEdgeFunction<ConfirmCheckoutResult>('confirm-checkout-payment', params);
}

export async function confirmBookingHold(params: {
  bookingReference: string;
  transactionId: string;
}): Promise<ConfirmBookingHoldResult> {
  return invokeEdgeFunction<ConfirmBookingHoldResult>('confirm-booking-hold', params);
}
