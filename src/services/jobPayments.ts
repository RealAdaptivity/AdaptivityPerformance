import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import { normalizePhoneForSms } from './onTheWaySms';
import type { CloseOut, PartsBy, TaxMode } from './closeOut';

/** Closing a job: the customer's signature, then record_job_payment, then the
 *  receipt. The totals the database stores are its own sums of the same lines
 *  (see closeOut.ts); what comes back is what was saved. */

export const SIGNATURE_BUCKET = 'booking-signatures';

export async function uploadSignature(bookingId: string, png: Blob): Promise<string> {
  const path = `${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, png, { contentType: 'image/png', upsert: false });
  if (error) throw new Error(`Could not save the signature: ${error.message}`);
  return path;
}

export type RecordedPayment = { totalCents: number; taxCents: number; techPayoutCents: number };

export type CloseOutOptions = {
  taxMode: TaxMode;
  partsBy: PartsBy;
  signaturePath?: string;
  signerName?: string;
  techNotes?: string;
  /** How a tech-confirmed payment was made. Card is set by the server. */
  paymentMethod?: 'cash' | 'zelle';
};

/** The p_payment body record_job_payment expects. */
export function closeOutPayload(closeOut: CloseOut, opts: CloseOutOptions) {
  return {
    kind: closeOut.kind,
    line_items: closeOut.lines.map((l) => ({
      title: l.title,
      labor_cents: l.laborCents,
      parts_cents: l.partsCents,
    })),
    diagnostic_cents: closeOut.diagnosticCents,
    travel_cents: closeOut.travelCents,
    weather_cents: closeOut.weatherCents,
    // The database works out the discount itself from the labor lines.
    first_responder: closeOut.firstResponder,
    tax_mode: opts.taxMode,
    parts_by: opts.partsBy,
    signature_path: opts.signaturePath ?? null,
    signer_name: opts.signerName ?? null,
    tech_notes: opts.techNotes ?? null,
    ...(opts.paymentMethod ? { payment_method: opts.paymentMethod } : {}),
  };
}

export async function recordJobPayment(
  bookingId: string,
  closeOut: CloseOut,
  opts: CloseOutOptions
): Promise<RecordedPayment> {
  const { data, error } = await supabase.rpc('record_job_payment', {
    p_booking_id: bookingId,
    p_payment: closeOutPayload(closeOut, opts),
  });
  if (error) throw new Error(error.message);
  const r = data as { total_cents: number; tax_cents: number; tech_payout_cents: number };
  return { totalCents: r.total_cents, taxCents: r.tax_cents, techPayoutCents: r.tech_payout_cents };
}

type ChannelResult = { status: 'sent' | 'skipped' | 'failed'; detail?: string; to?: string };

export type ReceiptSendResult = {
  sms?: ChannelResult;
  email?: ChannelResult;
  smsBody: string;
  subject: string;
  emailText: string;
};

export async function sendReceipt(
  bookingId: string,
  channels: ('sms' | 'email')[],
  contact: { phone?: string; email?: string }
): Promise<ReceiptSendResult> {
  return invokeEdgeFunction<ReceiptSendResult>('send-receipt', {
    bookingId,
    channels,
    phone: contact.phone || undefined,
    email: contact.email || undefined,
  });
}

/** Fallbacks while the business Twilio number or email sender is not set up:
 *  the same receipt, sent from the tech's own phone. */
export function openDeviceSms(phone: string, body: string): boolean {
  const to = normalizePhoneForSms(phone);
  if (!to) return false;
  window.location.href = `sms:${to}?body=${encodeURIComponent(body)}`;
  return true;
}

export function openDeviceEmail(email: string, subject: string, body: string): boolean {
  if (!email.trim()) return false;
  window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return true;
}

/** A short-lived link to a stored signature, for the tech or admin to view. */
export async function signatureUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export type JobPaymentSummary = {
  method: 'card' | 'zelle' | 'cash' | 'in_person';
  cardBrand: string | null;
  cardLast4: string | null;
  totalCents: number;
  recordedAt: string;
};

/** How a closed job was paid, for the admin dashboard. Null when no payment
 *  has been recorded for the job. */
export async function fetchJobPaymentSummary(bookingId: string): Promise<JobPaymentSummary | null> {
  const { data, error } = await supabase
    .from('job_payments')
    .select('payment_method, card_brand, card_last4, total_cents, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const m = String(data.payment_method ?? 'in_person');
  return {
    method: m === 'card' || m === 'zelle' || m === 'cash' ? m : 'in_person',
    cardBrand: (data.card_brand as string | null) ?? null,
    cardLast4: (data.card_last4 as string | null) ?? null,
    totalCents: Number(data.total_cents ?? 0),
    recordedAt: String(data.created_at ?? ''),
  };
}

/** "Card · Visa ••1234", "Zelle", "Cash" or "In person". */
export function paymentMethodLabel(p: Pick<JobPaymentSummary, 'method' | 'cardBrand' | 'cardLast4'>): string {
  if (p.method === 'card') {
    const brand = p.cardBrand ? p.cardBrand.charAt(0) + p.cardBrand.slice(1).toLowerCase().replace(/_/g, ' ') : '';
    const last4 = p.cardLast4 ? `••${p.cardLast4}` : '';
    const detail = [brand, last4].filter(Boolean).join(' ');
    return detail ? `Card · ${detail}` : 'Card';
  }
  if (p.method === 'zelle') return 'Zelle';
  if (p.method === 'cash') return 'Cash';
  return 'In person';
}
