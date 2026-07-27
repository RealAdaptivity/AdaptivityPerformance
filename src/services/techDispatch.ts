import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import { techStripeConnectUrls } from '../config/stripeConnectReturn';
import {
  readCachedTechConnectStatus,
  writeCachedTechConnectStatus,
} from './techConnectCache';

export type DispatchBooking = {
  id: string;
  referenceCode: string;
  customer: string;
  phone: string;
  address: string;
  vehicle: string;
  services: string[];
  total: number;
  status: string;
  distanceMiles: number;
  etaMinutes: number;
};

function mapRow(row: Record<string, unknown>): DispatchBooking {
  const services = Array.isArray(row.services) ? (row.services as string[]) : [];
  return {
    id: row.id as string,
    referenceCode: row.reference_code as string,
    customer: row.customer_name as string,
    phone: row.customer_phone as string,
    address: row.customer_address as string,
    vehicle: row.vehicle_description as string,
    services,
    total: Number(row.total_estimate),
    status: row.status as string,
    distanceMiles: Number(row.distance_miles),
    etaMinutes: Number(row.eta_minutes),
  };
}

export async function fetchDispatchBookings(): Promise<DispatchBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function claimBookingRow(referenceCode: string, mechanicId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'EN_ROUTE', mechanic_id: mechanicId, eta_minutes: 12, distance_miles: 5 })
    .eq('reference_code', referenceCode);
  if (error) throw error;
}

export async function updateBookingRow(
  referenceCode: string,
  patch: Partial<{ status: string; distance_miles: number; eta_minutes: number }>
) {
  const { error } = await supabase.from('bookings').update(patch).eq('reference_code', referenceCode);
  if (error) throw error;
}

export async function cancelJobWithHold(referenceCode: string) {
  return invokeEdgeFunction('cancel-booking-hold', {
    bookingReference: referenceCode,
    releaseJob: true,
  });
}

export async function captureBookingPayment(bookingReference: string) {
  return invokeEdgeFunction<{
    ok: boolean;
    capturedAmountDollars?: number;
    techPayoutDollars?: number;
    alreadyCaptured?: boolean;
    transferId?: string | null;
    transferWarning?: string | null;
    connectAccountId?: string | null;
  }>('capture-booking-payment', { bookingReference });
}

export function subscribeDispatchBookings(onChange: () => void) {
  return supabase
    .channel('web-tech-dispatch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onChange())
    .subscribe();
}

export type TechConnectStatus = {
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  transfersEnabled?: boolean;
  readyForPayouts: boolean;
  requirementsDue?: string[];
  duplicateStripeAccountsForEmail?: number;
  usingAccountId?: string;
  onboardingUrl?: string;
  /** Instant cash out destination on file (debit card with instant payout methods). */
  hasDebitCardForInstant?: boolean;
  hasBankAccount?: boolean;
};

export async function ensureTechProfile(vanNumber?: string) {
  const { error } = await supabase.rpc('ensure_tech_profile', {
    p_van_number: vanNumber?.trim() || 'Mobile Unit',
    p_role_title: 'ASE Technician',
  });
  if (error) throw error;
}

export async function fetchLocalMechanicStripeId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('mechanic_details')
    .select('stripe_account_id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) return null;
  const id = data?.stripe_account_id;
  return typeof id === 'string' && id.startsWith('acct_') ? id : null;
}

export async function fetchTechConnectStatus(): Promise<TechConnectStatus | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const localId = await fetchLocalMechanicStripeId();
  const cached = readCachedTechConnectStatus();

  try {
    const remote = await invokeEdgeFunction<TechConnectStatus>('create-stripe-account-link', {
      action: 'sync',
    });
    const merged: TechConnectStatus = {
      ...remote,
      accountId:
        remote?.accountId?.startsWith('acct_')
          ? remote.accountId
          : localId ?? cached?.accountId ?? null,
    };
    if (merged.accountId) writeCachedTechConnectStatus(merged);
    return merged;
  } catch {
    if (cached?.accountId) return cached;
    if (localId) {
      return {
        accountId: localId,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        readyForPayouts: false,
      };
    }
    return null;
  }
}

export async function openStripePayoutSetup(): Promise<TechConnectStatus & { onboardingUrl: string }> {
  await ensureTechProfile();
  const urls = techStripeConnectUrls();
  const data = await invokeEdgeFunction<TechConnectStatus & { onboardingUrl: string }>(
    'create-stripe-account-link',
    urls
  );
  if (!data?.onboardingUrl) {
    throw new Error(
      'Stripe did not return an onboarding link. Your saved Connect id may be invalid — redeploy create-stripe-account-link or clear mechanic_details.stripe_account_id.'
    );
  }
  return data;
}

export async function attachTechDebitCard(token: string) {
  return invokeEdgeFunction<{
    ok: boolean;
    message: string;
    hasDebitCardForInstant?: boolean;
    brand?: string;
    last4?: string;
  }>('attach-tech-debit-card', { token });
}

/** Express Dashboard login (bank settings). Debit cards: use attachTechDebitCard in portal. */
export async function openExpressDashboard(): Promise<{ loginUrl: string } & TechConnectStatus> {
  await ensureTechProfile();
  const data = await invokeEdgeFunction<TechConnectStatus & { loginUrl?: string; expressDashboardUrl?: string }>(
    'create-stripe-account-link',
    { action: 'express_login' }
  );
  const loginUrl = data.loginUrl || data.expressDashboardUrl;
  if (!loginUrl?.startsWith('http')) {
    throw new Error(
      data && 'error' in data && typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : 'Could not open Express Dashboard. Finish Connect Stripe Express first.'
    );
  }
  return { ...data, loginUrl };
}

export type TechPayoutRow = {
  id: string;
  bookingReference: string | null;
  techTransferCents: number | null;
  payoutStatus: string;
  paymentStatus: string;
  payoutError: string | null;
  createdAt: string;
};

export async function fetchTechPayoutHistory(): Promise<TechPayoutRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, booking_reference, tech_transfer_cents, payout_status, status, payout_error, created_at')
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    bookingReference: row.booking_reference,
    techTransferCents: row.tech_transfer_cents,
    payoutStatus: row.payout_status ?? 'none',
    paymentStatus: row.status ?? 'pending',
    payoutError: row.payout_error ?? null,
    createdAt: row.created_at,
  }));
}

export async function triggerInstantCashOut(method: 'instant' | 'standard') {
  return invokeEdgeFunction<{ message: string; method?: string; amountDollars?: number }>(
    'trigger-instant-payout',
    { method }
  );
}

export type TechPayoutPreview = {
  stripeOnboarded: boolean;
  stripeAccountId?: string | null;
  instantAvailableCents: number;
  availableCents: number;
  pendingCents?: number;
  connectTotalCents?: number;
  cashOutEligibleCents: number;
  cashOutEligibleDollars: number;
  availableDollars?: number;
  instantEligibleDollars?: number;
  connectTotalDollars?: number;
  pendingDollars?: number;
  canCashOut: boolean;
  canStandardCashOut?: boolean;
  canInstantCashOut?: boolean;
  hint?: string;
  hasDebitCardForInstant?: boolean;
  payoutsEnabled?: boolean;
  payoutBlockReason?: string | null;
};

export async function fetchTechPayoutPreview(): Promise<TechPayoutPreview> {
  return invokeEdgeFunction<TechPayoutPreview>('trigger-instant-payout', { action: 'preview' });
}
