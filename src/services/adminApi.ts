import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import { rowToBooking, type BookingRow } from './bookingMappers';
import type { Booking } from '../context/BookingContext';

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
      mechanic_details ( van_number, stripe_account_id, tools_verified )
    `
    )
    .eq('role', 'tech');

  if (roleError) throw new Error(roleError.message);

  const byId = new Map<string, DispatchTech>();

  for (const row of detailRows ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.id) continue;
    byId.set(profile.id as string, {
      id: profile.id as string,
      name: (profile.full_name as string) || 'Technician',
      phone: profile.phone as string | null,
      email: profile.email as string | null,
      vanNumber: (row.van_number as string) ?? null,
      stripeAccountId: (row.stripe_account_id as string) ?? null,
      toolsVerified: Boolean(row.tools_verified),
    });
  }

  for (const row of roleRows ?? []) {
    if (byId.has(row.id as string)) continue;
    const details = Array.isArray(row.mechanic_details)
      ? row.mechanic_details[0]
      : row.mechanic_details;
    byId.set(row.id as string, {
      id: row.id as string,
      name: (row.full_name as string) || 'Technician',
      phone: row.phone as string | null,
      email: row.email as string | null,
      vanNumber: (details?.van_number as string) ?? null,
      stripeAccountId: (details?.stripe_account_id as string) ?? null,
      toolsVerified: Boolean(details?.tools_verified),
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchAdminPayments(limit = 50): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, booking_reference, payment_intent_id, amount_cents, status, payout_status, payout_error, stripe_transfer_id, tech_stripe_account_id, created_at'
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

export async function adminPatchBooking(
  referenceCode: string,
  patch: {
    status?: JobStatus;
    mechanicId?: string | null;
    etaMinutes?: number;
    distanceMiles?: number;
  }
) {
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.mechanicId !== undefined) body.mechanic_id = patch.mechanicId;
  if (patch.etaMinutes !== undefined) body.eta_minutes = patch.etaMinutes;
  if (patch.distanceMiles !== undefined) body.distance_miles = patch.distanceMiles;

  const { error } = await supabase.from('bookings').update(body).eq('reference_code', referenceCode);
  if (error) throw new Error(error.message);
}

export function subscribeAdminBookings(onChange: () => void) {
  return supabase
    .channel('admin-dispatch-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onChange())
    .subscribe();
}

export async function adminCancelBookingHold(bookingReference: string, releaseJob = true) {
  return invokeEdgeFunction<{
    ok: boolean;
    bookingReference: string;
    stripeStatus: string | null;
    released: boolean;
  }>('admin-cancel-booking-hold', { bookingReference, releaseJob });
}

export async function adminAdjustCapture(
  bookingReference: string,
  captureAmountDollars: number,
  markCompleted = false
) {
  return invokeEdgeFunction('admin-adjust-capture', {
    bookingReference,
    captureAmountDollars,
    markCompleted,
  });
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
