import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  totalCharged: number;
  techShareAmount: number;
  platformShareAmount: number;
}

export async function createCheckoutPaymentIntent(params: {
  baseAmountDollars: number;
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
  clientSecret: string;
  paymentIntentId: string;
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
}): Promise<BookingHoldResult> {
  const data = await invokeEdgeFunction<BookingHoldResult>('create-booking-with-hold', params);
  if (!data?.clientSecret) throw new Error('Missing Stripe authorization from server');
  return data;
}
