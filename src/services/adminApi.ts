import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import { rowToBooking, type BookingRow } from './bookingMappers';
import type { Booking, JobStatus } from '../context/BookingContext';

const ADMIN_BOOKING_SELECT = `
  id,
  reference_code,
  customer_name,
  customer_phone,
  customer_address,
  zip_code,
  vehicle_description,
  vin,
  services,
  total_estimate,
  location_type,
  status,
  distance_miles,
  eta_minutes,
  mechanic_id,
  created_at,
  payment_intent_id,
  payment_status,
  hold_amount_cents,
  captured_amount_cents,
  dispatch_lat,
  dispatch_lng,
  preferred_date,
  preferred_time_window,
  customer_notes,
  preferred_mechanic_id,
  hold_expires_at,
  mechanic:profiles!bookings_mechanic_id_fkey (
    id,
    full_name,
    phone,
    mechanic_details ( van_number, role_title, rating, stripe_account_id )
  )
`;

export type DispatchTech = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vanNumber: string | null;
  stripeAccountId: string | null;
  toolsVerified: boolean;
  specialties: string[];
};

export type AdminPaymentRow = {
  id: string;
  bookingReference: string | null;
  paymentIntentId: string;
  amountCents: number;
  status: string;
  payoutStatus: string;
  payoutError: string | null;
  stripeTransferId: string | null;
  techStripeAccountId: string | null;
  createdAt: string;
};

export async function fetchAdminBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(ADMIN_BOOKING_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as BookingRow[]).map(rowToBooking);
}

export async function fetchDispatchTechs(): Promise<DispatchTech[]> {
  const { data: detailRows, error: detailsError } = await supabase.from('mechanic_details').select(`
      profile_id,
      van_number,
      stripe_account_id,
      tools_verified,
      specialties,
      profiles!mechanic_details_profile_id_fkey ( id, full_name, phone, email, role )
    `);

  if (detailsError) throw new Error(detailsError.message);

  const { data: roleRows, error: roleError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      phone,
      email,
      mechanic_details ( van_number, stripe_account_id, tools_verified, specialties )
    `
    )
    .eq('role', 'tech');

  if (roleError) throw new Error(roleError.message);

  const byId = new Map<string, DispatchTech>();

  for (const row of detailRows ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.id) continue;
    const specialties = Array.isArray(row.specialties)
      ? (row.specialties as string[])
      : ['mechanical'];
    byId.set(profile.id as string, {
      id: profile.id as string,
      name: (profile.full_name as string) || 'Technician',
      phone: profile.phone as string | null,
      email: profile.email as string | null,
      vanNumber: (row.van_number as string) ?? null,
      stripeAccountId: (row.stripe_account_id as string) ?? null,
      toolsVerified: Boolean(row.tools_verified),
      specialties: specialties.length ? specialties : ['mechanical'],
    });
  }

  for (const row of roleRows ?? []) {
    if (byId.has(row.id as string)) continue;
    const details = Array.isArray(row.mechanic_details)
      ? row.mechanic_details[0]
      : row.mechanic_details;
    const specialties = Array.isArray(details?.specialties)
      ? (details.specialties as string[])
      : ['mechanical'];
    byId.set(row.id as string, {
      id: row.id as string,
      name: (row.full_name as string) || 'Technician',
      phone: row.phone as string | null,
      email: row.email as string | null,
      vanNumber: (details?.van_number as string) ?? null,
      stripeAccountId: (details?.stripe_account_id as string) ?? null,
      toolsVerified: Boolean(details?.tools_verified),
      specialties: specialties.length ? specialties : ['mechanical'],
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchAdminPayments(limit = 50): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, booking_reference, payment_intent_id, amount_cents, status, payout_status, payout_error, stripe_transfer_id, tech_stripe_account_id, tech_transfer_cents, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: row.id as string,
    bookingReference: row.booking_reference as string | null,
    paymentIntentId: row.payment_intent_id as string,
    amountCents: row.amount_cents as number,
    status: row.status as string,
    payoutStatus: row.payout_status as string,
    payoutError: (row.payout_error as string | null) ?? null,
    stripeTransferId: (row.stripe_transfer_id as string | null) ?? null,
    techStripeAccountId: row.tech_stripe_account_id as string | null,
    createdAt: row.created_at as string,
  }));
}

/** YTD tech_transfer totals by Connect account for 1099-NEC $600 tracking. */
export async function fetchAdminNecYtdByStripeAccount(
  year = new Date().getFullYear()
): Promise<Map<string, number>> {
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;
  const { data, error } = await supabase
    .from('payments')
    .select('tech_stripe_account_id, tech_transfer_cents, status, created_at')
    .gte('created_at', start)
    .lt('created_at', end)
    .not('tech_stripe_account_id', 'is', null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of data || []) {
    const status = String(row.status || '');
    if (status !== 'succeeded' && status !== 'partially_refunded') continue;
    const acct = row.tech_stripe_account_id as string;
    if (!acct?.startsWith('acct_')) continue;
    map.set(acct, (map.get(acct) || 0) + (Number(row.tech_transfer_cents) || 0));
  }
  return map;
}

export async function adminPatchBooking(
  referenceCode: string,
  patch: {
    status?: JobStatus;
    mechanicId?: string | null;
    etaMinutes?: number;
    distanceMiles?: number;
    cancelReason?: string | null;
    noShowReason?: string | null;
  }
) {
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.mechanicId !== undefined) body.mechanic_id = patch.mechanicId;
  if (patch.etaMinutes !== undefined) body.eta_minutes = patch.etaMinutes;
  if (patch.distanceMiles !== undefined) body.distance_miles = patch.distanceMiles;
  if (patch.cancelReason !== undefined) body.cancel_reason = patch.cancelReason;
  if (patch.noShowReason !== undefined) body.no_show_reason = patch.noShowReason;

  const { error } = await supabase.from('bookings').update(body).eq('reference_code', referenceCode);
  if (error) throw new Error(error.message);
}

async function adminSetBookingReason(
  referenceCode: string,
  patch: { cancelReason?: string; noShowReason?: string }
) {
  const body: Record<string, unknown> = {};
  if (patch.cancelReason) body.cancel_reason = patch.cancelReason;
  if (patch.noShowReason) body.no_show_reason = patch.noShowReason;
  if (Object.keys(body).length === 0) return;
  const { error } = await supabase.from('bookings').update(body).eq('reference_code', referenceCode);
  if (error) throw new Error(error.message);
}

export function subscribeAdminBookings(onChange: () => void) {
  return supabase
    .channel('admin-dispatch-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onChange())
    .subscribe();
}

export async function adminCancelBookingHold(
  bookingReference: string,
  releaseJob = true,
  cancelReason?: string
) {
  const result = await invokeEdgeFunction<{
    ok: boolean;
    bookingReference: string;
    stripeStatus: string | null;
    released: boolean;
  }>('admin-cancel-booking-hold', { bookingReference, releaseJob });
  if (cancelReason) {
    await adminSetBookingReason(bookingReference, { cancelReason });
  }
  return result;
}

export async function adminAdjustCapture(
  bookingReference: string,
  captureAmountDollars: number,
  markCompleted = false,
  noShowReason?: string
) {
  const result = await invokeEdgeFunction('admin-adjust-capture', {
    bookingReference,
    captureAmountDollars,
    markCompleted,
  });
  if (noShowReason) {
    await adminSetBookingReason(bookingReference, { noShowReason });
  }
  return result;
}

export async function adminRefundBooking(
  bookingReference: string,
  refundAmountDollars?: number,
  forceAfterPayout = false
) {
  return invokeEdgeFunction('admin-refund-booking', {
    bookingReference,
    refundAmountDollars,
    forceAfterPayout,
  });
}

export async function adminRetryTransfer(bookingReference: string) {
  return invokeEdgeFunction<{
    ok: boolean;
    alreadyTransferred?: boolean;
    transferId?: string | null;
    techPayoutDollars?: number;
    connectAccountId?: string | null;
    error?: string;
  }>('admin-retry-transfer', { bookingReference });
}
