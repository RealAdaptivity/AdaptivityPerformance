import { supabase } from './supabaseClient';

export type TrackedBooking = {
  referenceCode: string;
  customerName: string;
  customerAddress: string;
  vehicle: string;
  services: string[];
  status: string;
  etaMinutes: number;
  distanceMiles: number;
  paymentStatus: string;
  dispatchLat: number | null;
  dispatchLng: number | null;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): TrackedBooking {
  const services = Array.isArray(row.services) ? (row.services as string[]) : [];
  return {
    referenceCode: row.reference_code as string,
    customerName: row.customer_name as string,
    customerAddress: row.customer_address as string,
    vehicle: row.vehicle_description as string,
    services,
    status: row.status as string,
    etaMinutes: Number(row.eta_minutes),
    distanceMiles: Number(row.distance_miles),
    paymentStatus: (row.payment_status as string) || 'none',
    dispatchLat: row.dispatch_lat != null ? Number(row.dispatch_lat) : null,
    dispatchLng: row.dispatch_lng != null ? Number(row.dispatch_lng) : null,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchBookingByReference(reference: string): Promise<TrackedBooking | null> {
  const { data, error } = await supabase.rpc('get_booking_by_reference', { ref: reference.trim() });
  if (error || !data?.[0]) return null;
  return mapRow(data[0] as Record<string, unknown>);
}

export function subscribeBookingReference(reference: string, onChange: () => void) {
  return supabase
    .channel(`track-${reference}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `reference_code=eq.${reference}`,
      },
      () => onChange()
    )
    .subscribe();
}
