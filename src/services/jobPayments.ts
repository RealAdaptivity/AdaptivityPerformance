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
    tax_mode: opts.taxMode,
    parts_by: opts.partsBy,
    signature_path: opts.signaturePath ?? null,
    signer_name: opts.signerName ?? null,
    tech_notes: opts.techNotes ?? null,
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
