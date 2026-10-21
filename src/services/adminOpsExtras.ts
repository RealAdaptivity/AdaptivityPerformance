import { supabase } from './supabaseClient';
import { DIAGNOSTIC_FEE_DOLLARS, techCanClaimServices } from './serviceCatalog';
import type { Booking, JobStatus } from '../context/BookingContext';
import { adminPatchBooking, type DispatchTech } from './adminApi';
import { sumPayByTech, texasYear, texasYearBounds } from './moneyIn';
import { buildPostIdea, type RecentJob } from './postIdeas';

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

/** What each tech earned in a calendar year (Texas time) on jobs closed in
 *  the tech app: tech_payout_cents, by the tech on the booking. This is the
 *  1099-NEC total; it used to be passed in empty, so every tech showed $0. */
export async function fetchTechPayForYear(year: number): Promise<Map<string, number>> {
  const { startIso, endIso } = texasYearBounds(year);
  const { data: pays, error } = await supabase
    .from('job_payments')
    .select('booking_id, tech_payout_cents')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .gt('tech_payout_cents', 0)
    .limit(10000);
  if (error) throw new Error(error.message);
  const ids = (pays ?? []).map((p) => p.booking_id as string);
  const techByBooking = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: rows, error: bErr } = await supabase
      .from('bookings')
      .select('id, mechanic_id')
      .in('id', ids.slice(i, i + 200));
    if (bErr) throw new Error(bErr.message);
    for (const b of rows ?? []) techByBooking.set(b.id as string, (b.mechanic_id as string | null) ?? null);
  }
  return sumPayByTech(
    (pays ?? []).map((p) => ({
      techId: techByBooking.get(p.booking_id as string) ?? null,
      cents: Number(p.tech_payout_cents) || 0,
    }))
  );
}

export type Tech1099 = Pick<DispatchTech, 'id' | 'name' | 'email' | 'phone'>;

/** Techs paid in the year who are no longer on the tech list (terminated or
 *  role changed) still get a 1099 line. */
export async function techsForPay(techs: DispatchTech[], pay: Map<string, number>): Promise<Tech1099[]> {
  const known = new Set(techs.map((t) => t.id));
  const missing = [...pay.keys()].filter((id) => !known.has(id));
  if (!missing.length) return techs;
  const { data } = await supabase.from('profiles').select('id, full_name, email, phone').in('id', missing);
  return [
    ...techs,
    ...(data ?? []).map((p) => ({
      id: p.id as string,
      name: (p.full_name as string | null) || 'Former tech',
      email: (p.email as string | null) ?? null,
      phone: (p.phone as string | null) ?? null,
    })),
  ];
}

export function export1099Csv(techs: Tech1099[], ytdByAcct: Map<string, number>, year = texasYear()) {
  const rows: string[][] = [
    ['tax_year', 'tech_name', 'email', 'phone', 'ytd_tech_share_dollars'],
  ];
  for (const t of techs) {
    const cents = ytdByAcct.get(t.id) || 0;
    rows.push([
      String(year),
      t.name,
      t.email || '',
      t.phone || '',
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
        detail: `${phone} — ${n} no-shows in 90d`,
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

  // Refunds come from Square onto the closed job (job_payments.refunded_cents).
  const { data: refunds } = await supabase
    .from('job_payments')
    .select('booking_id')
    .gt('refunded_cents', 0)
    .gte('created_at', since)
    .limit(500);
  if ((refunds || []).length >= 8) {
    flags.push({
      key: 'refunds:volume',
      label: 'Elevated refund volume',
      severity: 'med',
      detail: `${refunds!.length} jobs refunded in 90d — check them in Square`,
    });
  }

  return flags.sort((a, b) => {
    const rank = { high: 0, med: 1, low: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });
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

/** Post ideas for Google Business from the last few jobs closed out. */
export async function fetchRecentPostIdeas(limit = 5): Promise<{ id: string; caption: string; closedAt: string }[]> {
  const { data: pays, error } = await supabase
    .from('job_payments')
    .select('booking_id, created_at')
    .neq('kind', 'no_show')
    .order('created_at', { ascending: false })
    .limit(limit * 3);
  if (error) throw new Error(error.message);
  const ids = (pays ?? []).map((p) => p.booking_id as string);
  if (!ids.length) return [];
  const { data: rows, error: bErr } = await supabase
    .from('bookings')
    .select('id, customer_address, services, vehicle_description, status')
    .in('id', ids);
  if (bErr) throw new Error(bErr.message);
  const byId = new Map((rows ?? []).map((b) => [b.id as string, b]));
  const ideas: { id: string; caption: string; closedAt: string }[] = [];
  for (const p of pays ?? []) {
    const b = byId.get(p.booking_id as string);
    if (!b || b.status !== 'COMPLETED') continue;
    const job: RecentJob = {
      address: (b.customer_address as string | null) ?? null,
      service: Array.isArray(b.services) ? ((b.services as string[])[0] ?? null) : null,
      vehicle: (b.vehicle_description as string | null) ?? null,
    };
    ideas.push({ id: b.id as string, caption: buildPostIdea(job, DIAGNOSTIC_FEE_DOLLARS), closedAt: String(p.created_at) });
    if (ideas.length >= limit) break;
  }
  return ideas;
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
