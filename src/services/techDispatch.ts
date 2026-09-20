import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

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

/** Money is taken at the vehicle on Square, so the app records what was
 *  collected rather than moving it. Replaces captureBookingPayment. */
export async function recordInPersonPayment(
  referenceCode: string,
  opts?: {
    lineItems?: QuoteLineInput[];
    includeDiagnosticFee?: boolean;
    salesTaxDollars?: number;
    totalCollectedDollars?: number;
  }
) {
  const total =
    opts?.totalCollectedDollars ??
    (opts?.lineItems ?? []).reduce((sum, li) => sum + (li.laborDollars || 0) + (li.partsDollars || 0), 0) +
      (opts?.salesTaxDollars ?? 0);

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'COMPLETED',
      payment_status: 'paid_in_person',
      total_estimate: total,
      updated_at: new Date().toISOString(),
    })
    .ilike('reference_code', referenceCode.trim());
  if (error) throw error;
  return { ok: true, collectedDollars: total };
}

/** Release a claimed job back to the open pool. Nothing to void — no card was held. */
export async function releaseJob(referenceCode: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'UNASSIGNED', mechanic_id: null, updated_at: new Date().toISOString() })
    .ilike('reference_code', referenceCode.trim());
  if (error) throw error;
}

export async function updateBookingRow(
  referenceCode: string,
  patch: Partial<{ status: string; distance_miles: number; eta_minutes: number; dispatch_lat: number; dispatch_lng: number }>
) {
  const { error } = await supabase.from('bookings').update(patch).ilike('reference_code', referenceCode.trim());
  if (error) throw error;
}

export type QuoteLineInput = {
  title: string;
  laborDollars: number;
  partsDollars?: number;
  notes?: string;
};

/** @deprecated Use captureBookingPayment with line items — quote approval removed. */
/** @deprecated Customer quote approval removed — tech charges on site. */
/** @deprecated Use captureBookingPayment({ mode: 'diagnostic_only' }) from the tech. */
export function subscribeDispatchBookings(onChange: () => void) {
  return supabase
    .channel('web-tech-dispatch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onChange())
    .subscribe();
}


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

/**
 * Express Dashboard login (bank / debit). Requires a Live Express account.
 * If none exists yet (common after test→Live cutover), starts onboarding instead
 * and returns `onboardingUrl` so the UI can open that.
 */
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

/** Calendar-year tech share paid (for 1099-NEC $600 tracking), filtered strictly to this technician. */


export type SendPaymentLinkResult = {
  ok: boolean;
  url: string;
  totalDollars: number;
  smsSent: boolean;
  smsError: string | null;
};
