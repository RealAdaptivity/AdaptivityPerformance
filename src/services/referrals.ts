import { supabase } from './supabaseClient';

/** Ensure the signed-in customer has a referral code; returns the code string. */
export async function ensureReferralCode(): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_referral_code');
  if (error) throw error;
  if (!data || typeof data !== 'string') throw new Error('Could not create referral code');
  return data;
}

/** Credit balance in cents for the signed-in customer. */
export async function getCreditBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('customer_credit_balance_cents');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Field helper for booking insert / create-booking-with-hold payload. */
export function applyReferralCodeOnBooking(code?: string | null): {
  referralCode?: string;
} {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return {};
  return { referralCode: trimmed };
}
