import { supabase } from './supabaseClient';

const PLATFORM_SHARE = 0.3;
const TECH_SHARE = 0.7;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export type PaymentStatusSums = {
  succeededCents: number;
  refundedCents: number;
  otherCents: number;
  platformEstimateCents: number;
  techEstimateCents: number;
  paymentCount: number;
};

export type BookingStatusCounts = Record<string, number>;

export type ReasonCounts = {
  cancel: Record<string, number>;
  noShow: Record<string, number>;
  cancelTotal: number;
  noShowTotal: number;
};

export type PartnerPayoutRow = {
  id: string;
  businessName: string;
  city: string | null;
  zipCode: string | null;
  bookings30: number;
  bookings90: number;
  paymentCents30: number;
  paymentCents90: number;
};

function emptyReasonCounts(): ReasonCounts {
  return { cancel: {}, noShow: {}, cancelTotal: 0, noShowTotal: 0 };
}

function bump(map: Record<string, number>, key: string) {
  const k = key.trim() || 'unknown';
  map[k] = (map[k] || 0) + 1;
}

/** Last 30 days: payment totals by status + 30/70 split estimate from succeeded/captured. */
export async function fetchPnLPaymentSums(days = 30): Promise<PaymentStatusSums> {
  const since = daysAgoIso(days);
  const { data, error } = await supabase
    .from('payments')
    .select('amount_cents, status')
    .eq('is_test', false)
    .gte('created_at', since)
    .limit(5000);
  if (error) throw new Error(error.message);

  let succeededCents = 0;
  let refundedCents = 0;
  let otherCents = 0;
  for (const row of data || []) {
    const cents = Number(row.amount_cents) || 0;
    const status = String(row.status || '').toLowerCase();
    if (status === 'succeeded' || status === 'captured' || status === 'partially_refunded') {
      succeededCents += cents;
    } else if (status === 'refunded') {
      refundedCents += cents;
    } else {
      otherCents += cents;
    }
  }

  return {
    succeededCents,
    refundedCents,
    otherCents,
    platformEstimateCents: Math.round(succeededCents * PLATFORM_SHARE),
    techEstimateCents: Math.round(succeededCents * TECH_SHARE),
    paymentCount: (data || []).length,
  };
}

/** Booking counts by status (all time or optional recent window). */
export async function fetchBookingStatusCounts(days?: number): Promise<BookingStatusCounts> {
  let query = supabase.from('bookings').select('status').limit(8000);
  if (days != null) query = query.gte('created_at', daysAgoIso(days));
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const counts: BookingStatusCounts = {};
  for (const row of data || []) {
    const s = String(row.status || 'UNKNOWN');
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

/** Aggregate cancel_reason / no_show_reason on bookings. */
export async function fetchCancelNoShowReasonCounts(days = 90): Promise<ReasonCounts> {
  const since = daysAgoIso(days);
  const { data, error } = await supabase
    .from('bookings')
    .select('cancel_reason, no_show_reason')
    .gte('created_at', since)
    .or('cancel_reason.not.is.null,no_show_reason.not.is.null')
    .limit(5000);
  if (error) {
    // Columns may not exist until migration is applied
    if (/cancel_reason|no_show_reason|column/i.test(error.message)) {
      return emptyReasonCounts();
    }
    throw new Error(error.message);
  }

  const out = emptyReasonCounts();
  for (const row of data || []) {
    if (row.cancel_reason) {
      bump(out.cancel, String(row.cancel_reason));
      out.cancelTotal += 1;
    }
    if (row.no_show_reason) {
      bump(out.noShow, String(row.no_show_reason));
      out.noShowTotal += 1;
    }
  }
  return out;
}

/**
 * Partner locations with booking counts (partner_location_id) and related payment sums
 * for the last 30 and 90 days.
 */
export async function fetchPartnerPayoutReport(): Promise<PartnerPayoutRow[]> {
  const since90 = daysAgoIso(90);
  const since30 = daysAgoIso(30);

  const { data: locations, error: locErr } = await supabase
    .from('partner_locations')
    .select('id, business_name, city, zip_code')
    .order('business_name', { ascending: true });
  if (locErr) throw new Error(locErr.message);

  const { data: bookings, error: bookErr } = await supabase
    .from('bookings')
    .select('id, reference_code, partner_location_id, created_at')
    .not('partner_location_id', 'is', null)
    .gte('created_at', since90)
    .limit(8000);
  if (bookErr) throw new Error(bookErr.message);

  const bookingIds = (bookings || []).map((b) => b.id as string);
  const paymentByBookingId = new Map<string, number>();
  const paymentByRef = new Map<string, number>();

  if (bookingIds.length > 0) {
    // Chunk to avoid oversized .in() filters
    const chunkSize = 200;
    for (let i = 0; i < bookingIds.length; i += chunkSize) {
      const chunk = bookingIds.slice(i, i + chunkSize);
      const { data: pays, error: payErr } = await supabase
        .from('payments')
        .select('booking_id, booking_reference, amount_cents, status')
        .eq('is_test', false)
        .in('booking_id', chunk)
        .limit(5000);
      if (payErr) {
        // Fallback: match by booking_reference only
        break;
      }
      for (const p of pays || []) {
        const status = String(p.status || '').toLowerCase();
        if (status !== 'succeeded' && status !== 'captured' && status !== 'partially_refunded') {
          continue;
        }
        const cents = Number(p.amount_cents) || 0;
        if (p.booking_id) {
          paymentByBookingId.set(
            p.booking_id as string,
            (paymentByBookingId.get(p.booking_id as string) || 0) + cents
          );
        }
        if (p.booking_reference) {
          paymentByRef.set(
            p.booking_reference as string,
            (paymentByRef.get(p.booking_reference as string) || 0) + cents
          );
        }
      }
    }

    if (paymentByBookingId.size === 0) {
      const refs = [...new Set((bookings || []).map((b) => b.reference_code as string).filter(Boolean))];
      for (let i = 0; i < refs.length; i += chunkSize) {
        const chunk = refs.slice(i, i + chunkSize);
        const { data: pays } = await supabase
          .from('payments')
          .select('booking_reference, amount_cents, status')
          .eq('is_test', false)
          .in('booking_reference', chunk)
          .limit(5000);
        for (const p of pays || []) {
          const status = String(p.status || '').toLowerCase();
          if (status !== 'succeeded' && status !== 'captured' && status !== 'partially_refunded') {
            continue;
          }
          const ref = p.booking_reference as string;
          if (!ref) continue;
          paymentByRef.set(ref, (paymentByRef.get(ref) || 0) + (Number(p.amount_cents) || 0));
        }
      }
    }
  }

  const byPartner = new Map<
    string,
    { bookings30: number; bookings90: number; paymentCents30: number; paymentCents90: number }
  >();

  for (const b of bookings || []) {
    const pid = b.partner_location_id as string;
    if (!pid) continue;
    const created = new Date(b.created_at as string).getTime();
    const in30 = created >= new Date(since30).getTime();
    const cents =
      paymentByBookingId.get(b.id as string) ||
      paymentByRef.get(b.reference_code as string) ||
      0;
    const cur = byPartner.get(pid) || {
      bookings30: 0,
      bookings90: 0,
      paymentCents30: 0,
      paymentCents90: 0,
    };
    cur.bookings90 += 1;
    cur.paymentCents90 += cents;
    if (in30) {
      cur.bookings30 += 1;
      cur.paymentCents30 += cents;
    }
    byPartner.set(pid, cur);
  }

  return (locations || []).map((loc) => {
    const stats = byPartner.get(loc.id as string) || {
      bookings30: 0,
      bookings90: 0,
      paymentCents30: 0,
      paymentCents90: 0,
    };
    return {
      id: loc.id as string,
      businessName: (loc.business_name as string) || 'Partner',
      city: (loc.city as string | null) ?? null,
      zipCode: (loc.zip_code as string | null) ?? null,
      ...stats,
    };
  });
}

export const CANCEL_REASON_PRESETS = [
  { value: 'customer_request', label: 'Customer request', suggestedRefundDollars: 100 },
  { value: 'weather', label: 'Weather', suggestedRefundDollars: 100 },
  { value: 'duplicate', label: 'Duplicate', suggestedRefundDollars: 100 },
  { value: 'tech_delay', label: 'Tech delay / no show', suggestedRefundDollars: 100 },
  { value: 'partial_work', label: 'Partial work done', suggestedRefundDollars: 50 },
  { value: 'other', label: 'Other', suggestedRefundDollars: 25 },
] as const;

export const NO_SHOW_REASON_PRESETS = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'refused_service', label: 'Refused service' },
  { value: 'other', label: 'Other' },
] as const;

/** Suggested refund $ for a cancel reason (after capture). */
export function suggestedRefundForCancelReason(reason: string | null | undefined): number | null {
  const hit = CANCEL_REASON_PRESETS.find((r) => r.value === reason);
  return hit ? hit.suggestedRefundDollars : null;
}
