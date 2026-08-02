import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';

export type QuoteLineItem = {
  title: string;
  labor_cents: number;
  parts_cents: number;
  notes?: string;
};

export type TrackedBooking = {
  id: string;
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
  quoteStatus: string;
  recommendedTotalCents: number | null;
  quoteLineItems: QuoteLineItem[];
  quoteTotalCents: number | null;
  quoteDiagnosticFeeCents: number | null;
  quoteRepairsCents: number | null;
  quoteTechNotes: string | null;
  capturedAmountCents: number | null;
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  customerNotes: string | null;
};

function mapRow(row: Record<string, unknown>): TrackedBooking {
  const services = Array.isArray(row.services) ? (row.services as string[]) : [];
  const lineItems = Array.isArray(row.quote_line_items)
    ? (row.quote_line_items as QuoteLineItem[])
    : [];
  return {
    id: row.id as string,
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
    quoteStatus: (row.quote_status as string) || 'none',
    recommendedTotalCents: (row.recommended_total_cents as number | null) ?? null,
    quoteLineItems: lineItems,
    quoteTotalCents: (row.quote_total_cents as number | null) ?? null,
    quoteDiagnosticFeeCents: (row.quote_diagnostic_fee_cents as number | null) ?? null,
    quoteRepairsCents: (row.quote_repairs_cents as number | null) ?? null,
    quoteTechNotes: (row.quote_tech_notes as string | null) ?? null,
    capturedAmountCents: (row.captured_amount_cents as number | null) ?? null,
    preferredDate: (row.preferred_date as string | null) ?? null,
    preferredTimeWindow: (row.preferred_time_window as string | null) ?? null,
    customerNotes: (row.customer_notes as string | null) ?? null,
  };
}

export async function fetchBookingByReference(reference: string): Promise<TrackedBooking | null> {
  const { data, error } = await supabase.rpc('get_booking_by_reference', { ref: reference.trim() });
  if (error || !data?.[0]) return null;
  return mapRow(data[0] as Record<string, unknown>);
}

export async function recoverBookingReferences(phone: string) {
  return invokeEdgeFunction<{ message: string }>('recover-booking-reference', { phone });
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

/** Customer cancel when UNASSIGNED / EN_ROUTE and payment not captured. */
export async function cancelCustomerBooking(referenceCode: string) {
  return invokeEdgeFunction('cancel-booking-hold', {
    bookingReference: referenceCode.trim(),
    releaseJob: true,
  });
}

/** Post-capture tip ($1–$500). */
export async function addBookingTip(referenceCode: string, tipAmountDollars: number) {
  return invokeEdgeFunction<{ ok?: boolean; tipAmountDollars?: number }>('add-booking-tip', {
    bookingReference: referenceCode.trim(),
    tipAmountDollars,
  });
}

/** Reschedule preferred slot — keeps card hold. Releases tech if EN_ROUTE. */
export async function rescheduleCustomerBooking(opts: {
  referenceCode: string;
  preferredDate: string;
  preferredTimeWindow: string;
  customerNotes?: string;
}) {
  return invokeEdgeFunction<{
    ok?: boolean;
    preferredDate?: string;
    preferredTimeWindow?: string;
    releasedTech?: boolean;
    message?: string;
  }>('reschedule-booking', {
    bookingReference: opts.referenceCode.trim(),
    preferredDate: opts.preferredDate,
    preferredTimeWindow: opts.preferredTimeWindow,
    customerNotes: opts.customerNotes,
  });
}
