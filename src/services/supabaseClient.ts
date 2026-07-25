import { createClient } from '@supabase/supabase-js';

// Read Supabase environment variables from .env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://sample-project.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sample-anon-key';

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
 * Invoke Supabase Edge Function for Stripe Connect Payout
 */
export async function invokeStripePaymentEdgeFunction(payload: {
  amount: number;
  techStripeAccountId: string;
  customerEmail: string;
}) {
  console.log('[Supabase Edge Function] Invoking stripe-payout-handler...', payload);
  return await supabase.functions.invoke('stripe-payout-handler', {
    body: payload,
  });
}
