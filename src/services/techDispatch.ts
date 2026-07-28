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
  quoteStatus: string;
  holdAmountCents: number | null;
  paymentStatus: string;
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
    quoteStatus: (row.quote_status as string) || 'none',
    holdAmountCents: (row.hold_amount_cents as number | null) ?? null,
    paymentStatus: (row.payment_status as string) || 'none',
  };
}

export async function fetchDispatchBookings(): Promise<DispatchBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export type TechJobCapacity = 'multi' | 'standalone';

const ACTIVE_JOB_STATUSES = ['EN_ROUTE', 'ON_SITE'] as const;

export async function fetchMyJobCapacity(): Promise<TechJobCapacity> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'multi';
  const { data } = await supabase
    .from('mechanic_details')
    .select('job_capacity')
    .eq('profile_id', user.id)
    .maybeSingle();
  return data?.job_capacity === 'standalone' ? 'standalone' : 'multi';
}

export async function updateMyJobCapacity(capacity: TechJobCapacity) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await ensureTechProfile();
  const { error } = await supabase
    .from('mechanic_details')
    .update({ job_capacity: capacity })
    .eq('profile_id', user.id);
  if (error) throw error;
}

export async function claimBookingRow(referenceCode: string, mechanicId: string) {
  const { data: detail } = await supabase
    .from('mechanic_details')
    .select('job_capacity, w9_completed_at')
    .eq('profile_id', mechanicId)
    .maybeSingle();

  if (!detail?.w9_completed_at) {
    throw new Error(
      'Complete IRS Form W-9 before your first job: open Settings → connect Stripe Express and submit your SSN or EIN (tax ID). We never store your SSN ourselves — Stripe collects it for 1099 reporting.'
    );
  }

  if (detail?.job_capacity === 'standalone') {
    const { data: active, error: activeErr } = await supabase
      .from('bookings')
      .select('id, reference_code')
      .eq('mechanic_id', mechanicId)
      .in('status', [...ACTIVE_JOB_STATUSES])
      .neq('reference_code', referenceCode)
      .limit(1);
    if (activeErr) throw activeErr;
    if (active && active.length > 0) {
      throw new Error(
        'You are on Standalone mode (one job at a time). Finish or release your active job, or switch to Multi-job in Settings.'
      );
    }
  }

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

export async function captureBookingPayment(
  bookingReference: string,
  opts?: {
    mode?: 'charge' | 'diagnostic_only';
    lineItems?: QuoteLineInput[];
    techNotes?: string;
  }
) {
  return invokeEdgeFunction<{
    ok: boolean;
    capturedAmountDollars?: number;
    techPayoutDollars?: number;
    remainderDollars?: number;
    alreadyCaptured?: boolean;
    transferId?: string | null;
    transferWarning?: string | null;
    connectAccountId?: string | null;
    message?: string;
  }>('capture-booking-payment', {
    bookingReference,
    mode: opts?.mode ?? 'charge',
    lineItems: opts?.lineItems,
    techNotes: opts?.techNotes,
  });
}

export type QuoteLineInput = {
  title: string;
  laborDollars: number;
  partsDollars?: number;
  notes?: string;
};

/** @deprecated Use captureBookingPayment with line items — quote approval removed. */
export async function submitBookingQuote(
  bookingReference: string,
  lineItems: QuoteLineInput[],
  techNotes?: string
) {
  return captureBookingPayment(bookingReference, {
    mode: 'charge',
    lineItems,
    techNotes,
  }).then((r) => ({
    ok: r.ok,
    quoteId: '',
    totalDollars: r.capturedAmountDollars ?? 0,
    repairsDollars: 0,
    diagnosticFeeDollars: 100,
    message: r.message,
  }));
}

/** @deprecated Customer quote approval removed — tech charges on site. */
export async function approveBookingQuote(_bookingReference: string) {
  throw new Error(
    'Quote approval is no longer used. Your tech sets the price on site and charges through Adaptivity.'
  );
}

/** @deprecated Use captureBookingPayment({ mode: 'diagnostic_only' }) from the tech. */
export async function declineBookingQuote(_bookingReference: string, _reason?: string) {
  throw new Error(
    'Decline-quote is no longer used. Ask your tech to charge diagnostic only if you skip repairs.'
  );
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
  taxIdProvided?: boolean;
  requirementsDue?: string[];
  duplicateStripeAccountsForEmail?: number;
  usingAccountId?: string;
  onboardingUrl?: string;
  /** Instant cash out destination on file (debit card with instant payout methods). */
  hasDebitCardForInstant?: boolean;
  hasBankAccount?: boolean;
};

export async function ensureTechProfile(vanNumber?: string, specialties?: string[]) {
  const payload: Record<string, unknown> = {
    p_van_number: vanNumber?.trim() || 'Mobile Unit',
  };
  if (specialties?.length) {
    payload.p_specialties = specialties;
  }
  const { error } = await supabase.rpc('ensure_tech_profile', payload);
  if (error) throw error;
}

export async function fetchMyTechSpecialties(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return ['mechanical'];
  const { data } = await supabase
    .from('mechanic_details')
    .select('specialties')
    .eq('profile_id', user.id)
    .maybeSingle();
  const list = Array.isArray(data?.specialties) ? (data!.specialties as string[]) : [];
  return list.length ? list : ['mechanical'];
}

export async function updateMyTechSpecialties(specialties: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await ensureTechProfile(undefined, specialties);
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

export type TechW9Status = {
  completed: boolean;
  completedAt: string | null;
  taxIdProvided: boolean;
};

export async function fetchTechW9Status(): Promise<TechW9Status> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { completed: false, completedAt: null, taxIdProvided: false };
  const { data } = await supabase
    .from('mechanic_details')
    .select('w9_completed_at, tax_id_provided')
    .eq('profile_id', user.id)
    .maybeSingle();
  return {
    completed: Boolean(data?.w9_completed_at),
    completedAt: (data?.w9_completed_at as string) || null,
    taxIdProvided: Boolean(data?.tax_id_provided),
  };
}

/** Certify W-9 after Stripe collected SSN/EIN (or manual ack once tax is on file). */
export async function markTechW9Complete(): Promise<string> {
  const { data, error } = await supabase.rpc('mark_tech_w9_complete');
  if (error) throw error;
  return String(data);
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
