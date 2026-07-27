import { supabase } from './supabaseClient';
import { bookingToInsert, rowToBooking, type BookingRow } from './bookingMappers';
import type { Booking, JobStatus } from '../context/BookingContext';

const BOOKING_SELECT = `
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
  mechanic:profiles!bookings_mechanic_id_fkey (
    id,
    full_name,
    phone,
    mechanic_details ( van_number, role_title, rating, stripe_account_id )
  )
`;

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchAllBookings:', error.message);
    return [];
  }
  return (data as unknown as BookingRow[]).map(rowToBooking);
}

export async function fetchBookingByReference(reference: string): Promise<Booking | null> {
  const { data, error } = await supabase.rpc('get_booking_by_reference', { ref: reference });
  if (error || !data?.[0]) {
    console.warn('[Supabase] get_booking_by_reference:', error?.message);
    return null;
  }
  const row = data[0];
  return rowToBooking({
    ...row,
    vin: null,
    mechanic: null,
  } as BookingRow);
}

export async function createBooking(
  payload: Omit<Booking, 'id' | 'status' | 'dateCreated'>,
  customerId?: string | null
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingToInsert(payload, customerId))
    .select(BOOKING_SELECT)
    .single();

  if (error || !data) {
    console.warn('[Supabase] createBooking:', error?.message);
    return null;
  }
  return rowToBooking(data as unknown as BookingRow);
}

export async function updateBookingStatusRemote(
  referenceCode: string,
  status: JobStatus,
  fields?: { distanceMiles?: number; etaMinutes?: number; mechanicId?: string | null }
) {
  const patch: Record<string, unknown> = { status };
  if (fields?.distanceMiles !== undefined) patch.distance_miles = fields.distanceMiles;
  if (fields?.etaMinutes !== undefined) patch.eta_minutes = fields.etaMinutes;
  if (fields?.mechanicId !== undefined) patch.mechanic_id = fields.mechanicId;

  const { error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('reference_code', referenceCode);

  if (error) console.warn('[Supabase] updateBookingStatusRemote:', error.message);
}

export function subscribeAllBookings(onChange: () => void) {
  return supabase
    .channel('adaptivity-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onChange())
    .subscribe();
}
