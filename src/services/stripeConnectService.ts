import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe Publishable Key (from .env or fallback test key)
const stripePublishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_sample_adaptivity_key';
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
  techShareAmount: number; // 80%
  platformShareAmount: number; // 20%
  status: 'succeeded' | 'requires_action';
}

/**
 * Step 1: Onboard a Mobile Mechanic (Create Stripe Express Account Link)
 */
export async function createMechanicStripeAccount(
  techName: string,
  techEmail: string
): Promise<StripeAccountOnboardingResult> {
  // Production server endpoint mockup call
  console.log(`[Stripe Connect] Initializing Express Onboarding for ${techName} (${techEmail})...`);

  // In production, your Node/Vite backend calls:
  // const account = await stripe.accounts.create({
  //   type: 'express',
  //   country: 'US',
  //   email: techEmail,
  //   capabilities: { transfers: { requested: true } },
  // });
  // const accountLink = await stripe.accountLinks.create({
  //   account: account.id,
  //   refresh_url: 'http://localhost:5173/#reauth',
  //   return_url: 'http://localhost:5173/#tech-dashboard',
  //   type: 'account_onboarding',
  // });

  const mockAccountId = 'acct_1M' + Math.random().toString(36).substring(2, 11).toUpperCase();
  return {
    accountId: mockAccountId,
    onboardingUrl: `https://connect.stripe.com/express/oauth/authorize?response_type=code&client_id=ca_mock&scope=read_write`,
  };
}

/**
 * Step 2: Process Customer Payment & Auto-Split (80% Tech / 20% Platform)
 */
export async function processCustomerCheckoutWith8020Split(
  totalJobCost: number,
  customerEmail: string,
  techStripeAccountId: string,
  tipAmount: number = 0
): Promise<PaymentSplitResult> {
  const totalCharged = totalJobCost + tipAmount;
  const techShareAmount = Math.round(totalJobCost * 0.80) + tipAmount;
  const platformShareAmount = Math.round(totalJobCost * 0.20);

  console.log(`[Stripe Connect] Processing $${totalCharged} Total Charge for ${customerEmail}...`);
  console.log(` -> 80% Tech Payout: $${techShareAmount} to ${techStripeAccountId}`);
  console.log(` -> 20% Platform Fee: $${platformShareAmount} to Adaptivity Performance`);

  // In production, your server calls:
  // const dynamicAmountInCents = Math.round(totalCharged * 100);
  // const paymentIntent = await stripe.paymentIntents.create({
  //   amount: dynamicAmountInCents, // Accepts ANY dynamic dollar amount calculated for that specific car!
  //   currency: 'usd',
  //   description: `Vehicle Repair Ticket #${Math.floor(1000 + Math.random()*9000)}`,
  //   transfer_data: {
  //     destination: techStripeAccountId,
  //     amount: Math.round(techShareAmount * 100), // Dynamic 80% + Tip directly to Tech
  //   },
  // });

  return {
    paymentIntentId: 'pi_' + Math.random().toString(36).substring(2, 12),
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
