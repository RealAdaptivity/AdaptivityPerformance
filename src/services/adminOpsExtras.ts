import { supabase } from './supabaseClient';
import { techCanClaimServices } from './serviceCatalog';
import type { Booking, JobStatus } from '../context/BookingContext';
import { adminPatchBooking, type DispatchTech } from './adminApi';

/** Unclaimed age in minutes (null if assigned / terminal). */
export function unclaimedAgeMinutes(booking: {
  status: string;
  createdAtIso?: string;
  dateCreated?: string;
}): number | null {
  if (booking.status !== 'UNASSIGNED') return null;
  const raw = booking.createdAtIso || booking.dateCreated;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

export const SLA_UNCLAIMED_ALERT_MINUTES = 15;

export async function autoAssignNearestSpecialtyMatch(
  booking: Booking,
  techs: DispatchTech[]
): Promise<{ techId: string; techName: string } | null> {
  const eligible = techs.filter((t) => techCanClaimServices(t.specialties || [], booking.services));
  const preferredId = (booking as Booking & { preferredMechanicId?: string | null })
    .preferredMechanicId;
  if (preferredId && eligible.some((t) => t.id === preferredId)) {
    const hit = eligible.find((t) => t.id === preferredId)!;
    await adminPatchBooking(booking.id, {
      mechanicId: hit.id,
      status: 'EN_ROUTE' as JobStatus,
      etaMinutes: 25,
    });
    return { techId: hit.id, techName: hit.name };
  }
  const pick = eligible[0];
  if (!pick) return null;
  await adminPatchBooking(booking.id, {
    mechanicId: pick.id,
    status: 'EN_ROUTE' as JobStatus,
    etaMinutes: 30,
  });
  return { techId: pick.id, techName: pick.name };
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (c: string) => `"${String(c).replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function export1099Csv(techs: DispatchTech[], ytdByAcct: Map<string, number>) {
  const year = new Date().getFullYear();
  const rows: string[][] = [
    ['tax_year', 'tech_name', 'email', 'phone', 'stripe_account_id', 'ytd_tech_share_dollars'],
  ];
  for (const t of techs) {
    const acct = t.stripeAccountId || '';
    const cents = acct ? ytdByAcct.get(acct) || 0 : 0;
    rows.push([
      String(year),
      t.name,
      t.email || '',
      t.phone || '',
      acct,
      (cents / 100).toFixed(2),
    ]);
  }
  downloadCsv(`adaptivity-1099-nec-${year}.csv`, rows);
}

export async function exportPartnerReportCsv() {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'reference_code, status, total_estimate, captured_amount_cents, zip_code, created_at, partner_location_id, partner_locations ( business_name, city )'
    )
    .not('partner_location_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows: string[][] = [
    ['reference', 'partner', 'city', 'status', 'captured_dollars', 'zip', 'created_at'],
  ];
  for (const r of data || []) {
    const loc = Array.isArray(r.partner_locations) ? r.partner_locations[0] : r.partner_locations;
    const dollars =
      r.captured_amount_cents != null
        ? (Number(r.captured_amount_cents) / 100).toFixed(2)
        : Number(r.total_estimate || 0).toFixed(2);
    rows.push([
      String(r.reference_code || ''),
      String((loc as { business_name?: string } | null)?.business_name || ''),
      String((loc as { city?: string } | null)?.city || ''),
      String(r.status || ''),
      dollars,
      String(r.zip_code || ''),
      String(r.created_at || ''),
    ]);
  }
  downloadCsv(`adaptivity-partner-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export type FraudFlag = {
  key: string;
  label: string;
  severity: 'low' | 'med' | 'high';
  detail: string;
};

export async function fetchFraudFlags(): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('customer_phone, customer_id, status, no_show_reason, cancel_reason, payment_status')
    .gte('created_at', since)
    .limit(3000);
  if (error) throw new Error(error.message);

  const noShowByPhone = new Map<string, number>();
  const cancelByPhone = new Map<string, number>();
  for (const b of bookings || []) {
    const phone = String(b.customer_phone || '').replace(/\D/g, '');
    if (!phone) continue;
    if (b.status === 'COMPLETED' && b.no_show_reason) {
      noShowByPhone.set(phone, (noShowByPhone.get(phone) || 0) + 1);
    }
    if (b.status === 'CANCELED') {
      cancelByPhone.set(phone, (cancelByPhone.get(phone) || 0) + 1);
    }
  }
  for (const [phone, n] of noShowByPhone) {
    if (n >= 2) {
      flags.push({
        key: `noshow:${phone}`,
        label: 'Repeat no-shows',
        severity: n >= 3 ? 'high' : 'med',
        detail: `${phone} — ${n} no-show captures in 90d`,
      });
    }
  }
  for (const [phone, n] of cancelByPhone) {
    if (n >= 3) {
      flags.push({
        key: `cancel:${phone}`,
        label: 'Repeat cancels',
        severity: 'low',
        detail: `${phone} — ${n} cancels in 90d`,
      });
    }
  }

  const { data: refunds } = await supabase
    .from('payments')
    .select('booking_reference, status, amount_cents')
    .in('status', ['refunded', 'partially_refunded'])
    .gte('created_at', since)
    .limit(500);
  if ((refunds || []).length >= 8) {
    flags.push({
      key: 'refunds:volume',
      label: 'Elevated refund volume',
      severity: 'med',
      detail: `${refunds!.length} refunded/partial rows in 90d — review chargebacks in Stripe`,
    });
  }

  return flags.sort((a, b) => {
    const rank = { high: 0, med: 1, low: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });
}

export async function fetchExpiringHolds(withinHours = 48) {
  const now = new Date();
  const until = new Date(now.getTime() + withinHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .select('reference_code, customer_name, customer_phone, hold_expires_at, status, payment_status')
    .not('hold_expires_at', 'is', null)
    .lte('hold_expires_at', until)
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED')
    .order('hold_expires_at', { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchDueReviewAsks() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, reference_code, customer_name, customer_phone, review_ask_due_at, review_ask_sent_at')
    .eq('status', 'COMPLETED')
    .not('review_ask_due_at', 'is', null)
    .lte('review_ask_due_at', now)
    .is('review_ask_sent_at', null)
    .order('review_ask_due_at', { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function markReviewAskSent(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ review_ask_sent_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function fetchGbpDrafts() {
  const { data, error } = await supabase
    .from('gbp_post_drafts')
    .select('id, city_slug, caption, status, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function setGbpDraftStatus(id: string, status: 'copied' | 'posted' | 'dismissed') {
  const { error } = await supabase.from('gbp_post_drafts').update({ status }).eq('id', id);
  if (error) throw error;
}
