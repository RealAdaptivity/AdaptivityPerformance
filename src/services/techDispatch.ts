import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import { techStripeConnectUrls } from '../config/stripeConnectReturn';
import {
  clearCachedTechConnectStatus,
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
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  customerNotes: string | null;
  mechanicId: string | null;
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
    preferredDate: (row.preferred_date as string | null) ?? null,
    preferredTimeWindow: (row.preferred_time_window as string | null) ?? null,
    customerNotes: (row.customer_notes as string | null) ?? null,
    mechanicId: (row.mechanic_id as string | null) ?? null,
  };
}

export async function fetchDispatchBookings(): Promise<DispatchBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export type TechJobCapacity = 'multi' | 'standalone';

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
  const { data, error } = await supabase.rpc('set_my_job_capacity', {
    p_capacity: capacity,
  });
  if (error) throw new Error(error.message || 'Could not save work style');
  return (data as string) === 'standalone' ? 'standalone' : 'multi';
}

export async function claimBookingRow(referenceCode: string, mechanicId: string) {
  const cleanRef = referenceCode.trim();

  // 1. Try dedicated claim-booking Edge Function (uses service role, bypasses RLS)
  try {
    const result = await invokeEdgeFunction<{ ok: boolean }>('claim-booking', {
      bookingReference: cleanRef,
      mechanicId,
    });
    if (result?.ok) return;
  } catch (edgeErr) {
    console.warn('claim-booking edge function notice:', edgeErr);
  }

  // 2. Try claim_booking_for_current_tech RPC
  const { error: rpcError } = await supabase.rpc('claim_booking_for_current_tech', {
    p_reference: cleanRef,
  });

  if (rpcError) {
    console.warn('claim_booking_for_current_tech RPC notice:', rpcError.message);
    // 3. Fallback direct table update
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'EN_ROUTE',
        mechanic_id: mechanicId,
        eta_minutes: 20,
        distance_miles: 8,
      })
      .ilike('reference_code', cleanRef);

    if (updateError) {
      throw new Error(rpcError.message || updateError.message || 'Could not claim job in database.');
    }
  }
}

export async function updateBookingRow(
  referenceCode: string,
  patch: Partial<{ status: string; distance_miles: number; eta_minutes: number; dispatch_lat: number; dispatch_lng: number }>
) {
  const { error } = await supabase.from('bookings').update(patch).ilike('reference_code', referenceCode.trim());
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
    mode?: 'charge' | 'diagnostic_only' | 'no_show';
    lineItems?: QuoteLineInput[];
    techNotes?: string;
    customerAgreedOnSite?: boolean;
  }
) {
  return invokeEdgeFunction<{
    ok: boolean;
    capturedAmountDollars?: number;
    salesTaxDollars?: number;
    taxWarning?: string | null;
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
    customerAgreedOnSite: opts?.customerAgreedOnSite,
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
  if (error) {
    throw new Error(error.message || 'Could not ensure technician profile');
  }
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

export async function clearMyStripeConnectAccountId(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('mechanic_details')
    .update({ stripe_account_id: null })
    .eq('profile_id', user.id);
  if (error) {
    throw new Error(error.message || 'Could not clear saved Stripe account');
  }
  clearCachedTechConnectStatus();
}

/**
 * After test→live Stripe cutover, DB may still hold a test-mode acct_ that Live cannot open.
 * Clears the saved id so the next Connect call creates a fresh Live Express account.
 */
export async function resetStaleStripeConnectLink(): Promise<void> {
  await ensureTechProfile();
  await clearMyStripeConnectAccountId();
  try {
    await invokeEdgeFunction<TechConnectStatus>('create-stripe-account-link', {
      action: 'reset',
    });
  } catch {
    /* edge reset is best-effort; local clear is enough to unblock onboarding */
  }
  clearCachedTechConnectStatus();
}

export async function fetchTechConnectStatus(): Promise<TechConnectStatus | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cached = readCachedTechConnectStatus();

  try {
    const remote = await invokeEdgeFunction<TechConnectStatus>('create-stripe-account-link', {
      action: 'sync',
    });
    // Trust the edge sync result — do not re-attach a local/cached acct_ that Live already rejected.
    if (remote?.accountId?.startsWith('acct_')) {
      writeCachedTechConnectStatus(remote);
      return remote;
    }
    clearCachedTechConnectStatus();
    return {
      ...remote,
      accountId: null,
    };
  } catch {
    const localId = await fetchLocalMechanicStripeId();
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

  // Heal test→live leftovers: clear a saved acct_ the Live platform does not know.
  const localId = await fetchLocalMechanicStripeId();
  if (localId) {
    try {
      const sync = await invokeEdgeFunction<TechConnectStatus>('create-stripe-account-link', {
        action: 'sync',
      });
      if (!sync?.accountId?.startsWith('acct_')) {
        await clearMyStripeConnectAccountId();
      }
    } catch {
      // Sync often 500s on a test-mode acct_ with Live keys — clear so create can run.
      await clearMyStripeConnectAccountId();
    }
  }

  let data: (TechConnectStatus & { onboardingUrl: string }) | null = null;
  try {
    data = await invokeEdgeFunction<TechConnectStatus & { onboardingUrl: string }>(
      'create-stripe-account-link',
      urls
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such account|resource_missing|similar object exists in test mode|not a valid/i.test(msg)) {
      await clearMyStripeConnectAccountId();
      data = await invokeEdgeFunction<TechConnectStatus & { onboardingUrl: string }>(
        'create-stripe-account-link',
        { ...urls, forceRecreate: true }
      );
    } else {
      throw e;
    }
  }

  if (!data?.onboardingUrl) {
    await clearMyStripeConnectAccountId();
    data = await invokeEdgeFunction<TechConnectStatus & { onboardingUrl: string }>(
      'create-stripe-account-link',
      { ...urls, forceRecreate: true }
    );
  }
  if (!data?.onboardingUrl) {
    throw new Error(
      'Stripe did not return an onboarding link. Tap “Reset Stripe link” then Connect again, or confirm STRIPE_SECRET_KEY on Supabase is the Live key.'
    );
  }
  writeCachedTechConnectStatus(data);
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

/**
 * Express Dashboard login (bank / debit). Requires a Live Express account.
 * If none exists yet (common after test→Live cutover), starts onboarding instead
 * and returns `onboardingUrl` so the UI can open that.
 */
export async function openExpressDashboard(): Promise<
  { loginUrl: string } & TechConnectStatus & { onboardingUrl?: string; openedOnboarding?: boolean }
> {
  await ensureTechProfile();

  try {
    const data = await invokeEdgeFunction<
      TechConnectStatus & { loginUrl?: string; expressDashboardUrl?: string; error?: string }
    >('create-stripe-account-link', { action: 'express_login' });
    const loginUrl = data.loginUrl || data.expressDashboardUrl;
    if (loginUrl?.startsWith('http')) {
      return { ...data, loginUrl };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fall through to onboarding for "not linked yet" / dead test acct_
    if (
      !/connect stripe|finish connect|no such account|resource_missing|test mode|express first/i.test(
        msg
      )
    ) {
      throw e;
    }
    await clearMyStripeConnectAccountId().catch(() => undefined);
  }

  const onboard = await openStripePayoutSetup();
  if (!onboard.onboardingUrl?.startsWith('http')) {
    throw new Error(
      'No Live Stripe Express account yet. Tap Connect Stripe Express to finish onboarding first.'
    );
  }
  return {
    ...onboard,
    loginUrl: onboard.onboardingUrl,
    onboardingUrl: onboard.onboardingUrl,
    openedOnboarding: true,
  };
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

/** @deprecated Use signContractorAgreement from contractorAgreement.ts */
export async function markContractorAgreementSigned(): Promise<string> {
  const { data, error } = await supabase.rpc('mark_contractor_agreement_signed');
  if (error) throw error;
  return String(data);
}

/** @deprecated Use fetchContractorAgreementStatus from contractorAgreement.ts */
export async function fetchContractorAgreementStatus(): Promise<{
  signed: boolean;
  signedAt: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signed: false, signedAt: null };
  const { data } = await supabase
    .from('mechanic_details')
    .select('contractor_agreement_signed_at')
    .eq('profile_id', user.id)
    .maybeSingle();
  return {
    signed: Boolean(data?.contractor_agreement_signed_at),
    signedAt: (data?.contractor_agreement_signed_at as string) || null,
  };
}

/** Calendar-year tech share paid (for 1099-NEC $600 tracking). */
export async function fetchTechYearToDateCompensation(year = new Date().getFullYear()): Promise<{
  year: number;
  totalCents: number;
  totalDollars: number;
  thresholdDollars: number;
  meetsNecThreshold: boolean;
}> {
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;
  const { data, error } = await supabase
    .from('payments')
    .select('tech_transfer_cents, status, created_at')
    .eq('is_test', false)
    .gte('created_at', start)
    .lt('created_at', end);
  if (error) throw error;
  const totalCents = (data ?? []).reduce((sum, row) => {
    const status = String(row.status || '');
    if (status !== 'succeeded' && status !== 'partially_refunded') return sum;
    return sum + (Number(row.tech_transfer_cents) || 0);
  }, 0);
  const thresholdDollars = 600;
  return {
    year,
    totalCents,
    totalDollars: totalCents / 100,
    thresholdDollars,
    meetsNecThreshold: totalCents >= thresholdDollars * 100,
  };
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
    .eq('is_test', false)
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
