import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabasePublic';

const supabaseUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Adaptivity Performance Database Table Schema Definitions
 * 
 * Tables in Supabase:
 * 1. `bookings`: id, customer_name, customer_phone, customer_address, vehicle, services, total_estimate, status, tech_id, distance_miles, eta_minutes
 * 2. `mechanics`: id, name, phone, van_number, stripe_account_id, rating, tools_verified, revenue_share_pct
 * 3. `customer_vehicles`: id, user_id, make, model, year, vin, health_score, license_plate
 * 4. `inspection_reports`: id, booking_id, vehicle_id, inspector_name, findings_json, customer_signature_url
 */

/**
 * Realtime Mobile Dispatch GPS Tracker Subscription
 * Listens for live ETA and location updates from the mobile mechanic's van!
 */
export function subscribeToLiveJobDispatch(bookingId: string, onUpdate: (updatedJob: any) => void) {
  console.log(`[Supabase Realtime] Subscribing to live dispatch updates for Job #${bookingId}...`);

  return supabase
    .channel(`booking-${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
      (payload) => {
        console.log('[Supabase Realtime] Live Dispatch Location Update Received:', payload.new);
        onUpdate(payload.new);
      }
    )
    .subscribe();
}

/**
 * Invoke Supabase Edge Function for Stripe Connect checkout (legacy alias)
 */
export async function invokeStripePaymentEdgeFunction(payload: {
  amount: number;
  techStripeAccountId: string;
  customerEmail: string;
  bookingReference?: string;
}) {
  const { createCheckoutPaymentIntent } = await import('./stripePaymentsApi');
  return createCheckoutPaymentIntent({
    baseAmountDollars: payload.amount,
    tipAmountDollars: 0,
    customerEmail: payload.customerEmail,
    techStripeAccountId: payload.techStripeAccountId,
    bookingReference: payload.bookingReference,
  });
}
