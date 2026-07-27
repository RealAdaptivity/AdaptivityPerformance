import type { Booking, JobStatus, TechProfile } from '../context/BookingContext';

export type BookingRow = {
  id: string;
  reference_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  zip_code: string | null;
  vehicle_description: string;
  vin: string | null;
  services: string[] | unknown;
  total_estimate: number;
  location_type: 'mobile' | 'shop';
  status: JobStatus;
  distance_miles: number;
  eta_minutes: number;
  mechanic_id: string | null;
  created_at: string;
  payment_intent_id?: string | null;
  payment_status?: string;
  hold_amount_cents?: number | null;
  captured_amount_cents?: number | null;
  dispatch_lat?: number | null;
  dispatch_lng?: number | null;
  mechanic?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    mechanic_details?: {
      van_number: string | null;
      role_title: string | null;
      rating: number | null;
      stripe_account_id?: string | null;
    } | null;
  } | null;
};

export function rowToBooking(row: BookingRow): Booking {
  const services = Array.isArray(row.services) ? (row.services as string[]) : [];
  let claimedBy: TechProfile | undefined;
  if (row.mechanic) {
    claimedBy = {
      id: row.mechanic.id,
      name: row.mechanic.full_name || 'Technician',
      role: row.mechanic.mechanic_details?.role_title || 'ASE Technician',
      vanNumber: row.mechanic.mechanic_details?.van_number || 'Mobile Unit',
      phone: row.mechanic.phone || '',
      rating: row.mechanic.mechanic_details?.rating ?? 4.9,
      stripeAccountId: row.mechanic.mechanic_details?.stripe_account_id ?? null,
    };
  }

  return {
    id: row.reference_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    zipCode: row.zip_code || '',
    vehicle: row.vehicle_description,
    vin: row.vin || undefined,
    services,
    totalEstimate: Number(row.total_estimate),
    locationType: row.location_type,
    status: row.status,
    claimedBy,
    distanceMiles: Number(row.distance_miles),
    etaMinutes: row.eta_minutes,
    dateCreated: new Date(row.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    supabaseId: row.id,
    paymentIntentId: row.payment_intent_id ?? null,
    paymentStatus: row.payment_status ?? 'none',
    holdAmountCents: row.hold_amount_cents ?? null,
    capturedAmountCents: row.captured_amount_cents ?? null,
    dispatchLat: row.dispatch_lat != null ? Number(row.dispatch_lat) : null,
    dispatchLng: row.dispatch_lng != null ? Number(row.dispatch_lng) : null,
  };
}

export function bookingToInsert(
  data: Omit<Booking, 'id' | 'status' | 'dateCreated'>,
  customerId?: string | null
) {
  return {
    customer_id: customerId ?? null,
    customer_name: data.customerName,
    customer_phone: data.customerPhone,
    customer_address: data.customerAddress,
    zip_code: data.zipCode,
    vehicle_description: data.vehicle,
    vin: data.vin ?? null,
    services: data.services,
    total_estimate: data.totalEstimate,
    location_type: data.locationType,
    status: 'UNASSIGNED' as JobStatus,
    distance_miles: data.distanceMiles,
    eta_minutes: data.etaMinutes,
    reference_code: '',
  };
}
