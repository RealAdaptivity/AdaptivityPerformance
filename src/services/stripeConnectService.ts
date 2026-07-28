import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe Publishable Key — never use a fake key in production builds
const stripePublishableKey =
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
  (import.meta.env.DEV ? 'pk_test_sample_adaptivity_key' : '');
if (!stripePublishableKey && !import.meta.env.DEV) {
  console.error('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is required for production builds');
}
let stripePromise: ReturnType<typeof loadStripe> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

export interface StripeAccountOnboardingResult {
  accountId: string;
  onboardingUrl: string;
}

export interface PaymentSplitResult {
  paymentIntentId: string;
  totalCharged: number;
  techShareAmount: number; // 70%
  platformShareAmount: number; // 20%
  status: 'succeeded' | 'requires_action';
}

/**
 * Step 1: Onboard a Mobile Mechanic (Stripe Express via Supabase Edge Function)
 */
export async function createMechanicStripeAccount(
  techName: string,
  techEmail: string,
  profileId?: string
): Promise<StripeAccountOnboardingResult> {
  const { startMechanicStripeOnboarding } = await import('./stripePaymentsApi');
  const result = await startMechanicStripeOnboarding({
    techName,
    techEmail,
    profileId,
    returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/#tech-onboarding-complete` : undefined,
    refreshUrl: typeof window !== 'undefined' ? `${window.location.origin}/#tech-onboarding-refresh` : undefined,
  });
  return {
    accountId: result.accountId,
    onboardingUrl: result.onboardingUrl,
  };
}

/**
 * @deprecated Use create-booking-with-hold + capture-booking-payment (70/30). This mock must not run in prod.
 */
export async function processCustomerCheckoutWith8020Split(
  totalJobCost: number,
  customerEmail: string,
  techStripeAccountId: string,
  tipAmount: number = 0
): Promise<PaymentSplitResult> {
  if (!import.meta.env.DEV) {
    throw new Error(
      'Legacy mock checkout is disabled. Use booking card hold → capture (70% tech / 30% platform).'
    );
  }

  const totalCharged = totalJobCost + tipAmount;
  const techShareAmount = Math.round(totalJobCost * 0.7) + tipAmount;
  const platformShareAmount = Math.round(totalJobCost * 0.3);

  console.warn(
    `[Stripe Connect DEV MOCK] $${totalCharged} for ${customerEmail} → tech $${techShareAmount} (${techStripeAccountId}), platform $${platformShareAmount}`
  );

  return {
    paymentIntentId: 'pi_mock_' + Math.random().toString(36).substring(2, 12),
    totalCharged,
    techShareAmount,
    platformShareAmount,
    status: 'succeeded',
  };
}

/**
 * Step 3: Dynamic Price Calculator for Any Vehicle Make/Model
 * 
 * Calculates exact dynamic total based on:
 * - Vehicle Make & Tier Multiplier (e.g. Standard 1.0x vs German Euro 1.35x vs Diesel 1.25x)
 * - Labor Hours & OEM Parts
 * - Mobile Distance ($2.00 / mile)
 * - Sales Tax (8.25%)
 */
export function calculateDynamicVehicleTicketTotal(params: {
  laborHours: number;
  hourlyRate?: number; // default $125/hr
  basePartsCost: number;
  vehicleTierMultiplier?: number; // e.g. 1.0, 1.25, 1.35, 1.50
  distanceMiles?: number;
  perMileRate?: number; // default $2.00/mi
}): {
  laborCost: number;
  partsCost: number;
  travelFee: number;
  subtotal: number;
  tax: number;
  grandTotal: number;
  stripeAmountInCents: number;
} {
  const hourlyRate = params.hourlyRate || 125;
  const multiplier = params.vehicleTierMultiplier || 1.0;
  const perMileRate = params.perMileRate || 2.0;
  const distanceMiles = params.distanceMiles || 0;

  const freeMilesThreshold = 15;
  const extraMiles = Math.max(0, distanceMiles - freeMilesThreshold);
  const travelFee = Math.round(extraMiles * perMileRate * 100) / 100;

  const laborCost = Math.round(params.laborHours * hourlyRate * multiplier);
  const partsCost = Math.round(params.basePartsCost * multiplier);

  const subtotal = laborCost + partsCost + travelFee;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;
  const stripeAmountInCents = Math.round(grandTotal * 100);

  return {
    laborCost,
    partsCost,
    travelFee,
    subtotal,
    tax,
    grandTotal,
    stripeAmountInCents,
  };
}
