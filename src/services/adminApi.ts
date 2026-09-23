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
    mechanic_details!mechanic_details_profile_id_fkey ( van_number, role_title, rating )
  )
`;

export type DispatchTech = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vanNumber: string | null;
  toolsVerified: boolean;
  specialties: string[];
  lastSignInAt: string | null;
  /** Open shift start, or null when the tech is clocked out. */
  onShiftSince: string | null;
};

export type AdminPaymentRow = {
  id: string;
  bookingReference: string | null;
  paymentIntentId: string;
  amountCents: number;
  status: string;
  payoutStatus: string;
  payoutError: string | null;
  createdAt: string;
  isTest?: boolean;
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
      tools_verified,
      specialties,
      terminated_at,
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
      mechanic_details!mechanic_details_profile_id_fkey ( van_number, tools_verified, specialties )
    `
    )
    .eq('role', 'tech');

  if (roleError) throw new Error(roleError.message);

  const byId = new Map<string, DispatchTech>();
  const terminatedIds = new Set<string>();

  for (const row of detailRows ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.id) continue;
    if (row.terminated_at) {
      terminatedIds.add(profile.id as string);
      continue;
    }
    const specialties = Array.isArray(row.specialties)
      ? (row.specialties as string[])
      : ['mechanical'];
    byId.set(profile.id as string, {
      id: profile.id as string,
      name: (profile.full_name as string) || 'Technician',
      phone: profile.phone as string | null,
      email: profile.email as string | null,
      vanNumber: (row.van_number as string) ?? null,
      toolsVerified: Boolean(row.tools_verified),
      specialties: specialties.length ? specialties : ['mechanical'],
      lastSignInAt: null,
      onShiftSince: null,
    });
  }

  for (const row of roleRows ?? []) {
    if (terminatedIds.has(row.id as string)) continue;
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
      toolsVerified: Boolean(details?.tools_verified),
      specialties: specialties.length ? specialties : ['mechanical'],
      lastSignInAt: null,
      onShiftSince: null,
    });
  }

  // Enrich with last login and auth email from auth.users
  try {
    const loginData = await invokeEdgeFunction<{ ok: boolean; lastSignIn: Record<string, string | null>; authEmails: Record<string, string | null> }>('admin-get-last-logins', {});
    if (loginData.ok && loginData.lastSignIn) {
      for (const tech of byId.values()) {
        tech.lastSignInAt = loginData.lastSignIn[tech.id] ?? null;
        // Backfill email from auth if missing in profile
        if (!tech.email && loginData.authEmails?.[tech.id]) {
          tech.email = loginData.authEmails[tech.id];
        }
      }
    }
  } catch {
    // Non-fatal: last login data unavailable
  }

  // Who is clocked in right now. Admins can read every shift row; a tech never
  // reaches this function.
  const { data: openShifts } = await supabase
    .from('tech_shifts')
    .select('profile_id, clocked_in_at')
    .is('clocked_out_at', null);
  for (const shift of openShifts ?? []) {
    const tech = byId.get(shift.profile_id as string);
    if (tech) tech.onShiftSince = shift.clocked_in_at as string;
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function terminateTechnician(technicianId: string, reason: string) {
  return invokeEdgeFunction<{ ok: boolean; email?: string }>('terminate-technician', {
    technicianId,
    reason,
  });
}

export async function fetchAdminPayments(limit = 50): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, booking_reference, payment_intent_id, amount_cents, status, payout_status, payout_error, tech_transfer_cents, created_at, is_test'
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
    createdAt: row.created_at as string,
    isTest: Boolean(row.is_test),
  }));
}

/** YTD tech_transfer totals by Connect account for 1099-NEC $600 tracking. */

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
  const { error } = await supabase
    .from('bookings')
    .update({
      status: releaseJob ? 'UNASSIGNED' : 'CANCELED',
      mechanic_id: releaseJob ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .ilike('reference_code', bookingReference.trim());
  if (error) throw error;
  const result = { ok: true, bookingReference, released: releaseJob };
  if (cancelReason) {
    await adminSetBookingReason(bookingReference, { cancelReason });
  }
  return result;
}
