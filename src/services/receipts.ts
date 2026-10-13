/** Receipts: every paid job closed in the tech app (job_payments), and the
 *  receipts an admin makes from a quote that was paid some other way
 *  (public.receipts). Both are numbered from the same R- sequence. Admin only. */

import { supabase } from './supabaseClient';
import { paymentMethodText, type PaymentMethod } from './receiptMessage';
import { SITE_ORIGIN, SITE_PHONE_DISPLAY } from '../site/seo';
import { lineLaborCents, setQuoteStatus, type Quote } from './quotes';
import type { InvoiceDoc } from './invoiceData';
import {
  normalizeReference,
  paidOnInstant,
  paidViaText,
  receiptReferenceError,
  splitPickupLine,
  withPickupLine,
  type ReceiptMethod,
  type StoredReceiptLine,
} from './receiptPayment';

const dollarsToCents = (n: number) => Math.round((Number(n) || 0) * 100);

export type ReceiptRow = {
  /** 'job' — closed in the tech app; 'quote' — made here from a quote. */
  source: 'job' | 'quote';
  /** booking id for a job, receipts.id for one made from a quote. */
  id: string;
  receiptNumber: string;
  /** AP-… for a job, Q-… for a quote, when known. */
  reference: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicle: string | null;
  totalCents: number;
  refundedCents: number;
  paidVia: string;
  /** ISO timestamp, for sorting and the date shown. */
  paidAt: string;
  sentByText: boolean;
  sentByEmail: boolean;
};

type JobRow = {
  booking_id: string;
  receipt_number: string | null;
  total_cents: number;
  refunded_cents: number | null;
  payment_method: string | null;
  card_brand: string | null;
  card_last4: string | null;
  zelle_confirmation: string | null;
  created_at: string;
  receipt_texted_at: string | null;
  receipt_emailed_at: string | null;
  booking:
    | { reference_code: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; vehicle_description: string | null }
    | { reference_code: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null; vehicle_description: string | null }[]
    | null;
};

export type StandaloneReceipt = {
  id: string;
  receiptNumber: string;
  quoteId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  vehicle: string | null;
  vin: string | null;
  lines: StoredReceiptLine[];
  laborCents: number;
  /** Parts alone, without the pickup fee. */
  partsCents: number;
  partsPickupCents: number;
  taxMode: 'parts' | 'total' | 'none';
  taxCents: number;
  totalCents: number;
  paymentMethod: ReceiptMethod;
  paymentReference: string | null;
  /** 'YYYY-MM-DD', Texas date. */
  paidOn: string;
  notes: string | null;
  createdAt: string;
};

function rowToStandalone(row: Record<string, unknown>): StandaloneReceipt {
  const { lines, partsPickupCents } = splitPickupLine(row.line_items);
  const taxMode = row.tax_mode === 'total' || row.tax_mode === 'none' ? row.tax_mode : 'parts';
  return {
    id: row.id as string,
    receiptNumber: row.receipt_number as string,
    quoteId: (row.quote_id as string | null) ?? null,
    customerName: row.customer_name as string,
    customerPhone: (row.customer_phone as string | null) ?? null,
    customerEmail: (row.customer_email as string | null) ?? null,
    customerAddress: (row.customer_address as string | null) ?? null,
    vehicle: (row.vehicle as string | null) ?? null,
    vin: (row.vin as string | null) ?? null,
    lines,
    laborCents: Number(row.labor_cents) || 0,
    partsCents: Math.max(0, (Number(row.parts_cents) || 0) - partsPickupCents),
    partsPickupCents,
    taxMode,
    taxCents: Number(row.tax_cents) || 0,
    totalCents: Number(row.total_cents) || 0,
    paymentMethod: row.payment_method as ReceiptMethod,
    paymentReference: (row.payment_reference as string | null) ?? null,
    paidOn: String(row.paid_on ?? ''),
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Newest first: paid jobs and receipts made from quotes, together. */
export async function listReceipts(limit = 200): Promise<ReceiptRow[]> {
  const [jobs, made, quotes] = await Promise.all([
    supabase
      .from('job_payments')
      .select(
        'booking_id, receipt_number, total_cents, refunded_cents, payment_method, card_brand, card_last4, zelle_confirmation, created_at, receipt_texted_at, receipt_emailed_at, booking:bookings!job_payments_booking_id_fkey ( reference_code, customer_name, customer_phone, customer_email, vehicle_description )'
      )
      .neq('kind', 'no_show')
      .gt('total_cents', 0)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('receipts').select('*').order('created_at', { ascending: false }).limit(limit),
    supabase.from('quotes').select('id, quote_number').order('created_at', { ascending: false }).limit(500),
  ]);
  if (jobs.error) throw new Error(jobs.error.message);
  if (made.error) throw new Error(made.error.message);
  const quoteNumbers = new Map((quotes.data ?? []).map((q) => [q.id as string, q.quote_number as string]));

  const fromJobs: ReceiptRow[] = ((jobs.data ?? []) as unknown as JobRow[]).map((j) => {
    const b = Array.isArray(j.booking) ? j.booking[0] : j.booking;
    const method = String(j.payment_method ?? 'in_person');
    return {
      source: 'job',
      id: j.booking_id,
      receiptNumber: j.receipt_number ?? '—',
      reference: b?.reference_code ?? null,
      customerName: b?.customer_name || 'Customer',
      customerPhone: b?.customer_phone ?? null,
      customerEmail: b?.customer_email ?? null,
      vehicle: b?.vehicle_description ?? null,
      totalCents: j.total_cents,
      refundedCents: Number(j.refunded_cents) || 0,
      paidVia:
        method === 'zelle' && j.zelle_confirmation
          ? `Zelle · conf. ${j.zelle_confirmation}`
          : paymentMethodText({
              method: (['card', 'cash', 'zelle'].includes(method) ? method : 'in_person') as PaymentMethod,
              cardBrand: j.card_brand,
              cardLast4: j.card_last4,
            }),
      paidAt: j.created_at,
      sentByText: Boolean(j.receipt_texted_at),
      sentByEmail: Boolean(j.receipt_emailed_at),
    };
  });

  const fromQuotes: ReceiptRow[] = (made.data ?? []).map((row) => {
    const r = rowToStandalone(row as Record<string, unknown>);
    return {
      source: 'quote',
      id: r.id,
      receiptNumber: r.receiptNumber,
      reference: r.quoteId ? quoteNumbers.get(r.quoteId) ?? null : null,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail,
      vehicle: r.vehicle,
      totalCents: r.totalCents,
      refundedCents: 0,
      paidVia: paidViaText(r.paymentMethod, r.paymentReference),
      paidAt: paidOnInstant(r.paidOn),
      sentByText: false,
      sentByEmail: false,
    };
  });

  return [...fromJobs, ...fromQuotes].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

/** quote id → the receipt made from it, so a quote is not receipted twice. */
export async function receiptNumbersByQuote(): Promise<Map<string, { id: string; receiptNumber: string }>> {
  const { data, error } = await supabase.from('receipts').select('id, quote_id, receipt_number').not('quote_id', 'is', null);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.quote_id as string, { id: r.id as string, receiptNumber: r.receipt_number as string }]));
}

export type ReceiptPayment = {
  method: ReceiptMethod;
  reference?: string;
  /** 'YYYY-MM-DD'. */
  paidOn: string;
  notes?: string;
};

/**
 * The receipt for a quote the customer paid: the quote's own lines and
 * totals, exactly as quoted, plus how and when it was paid. The quote is
 * marked accepted.
 */
export async function createReceiptFromQuote(quote: Quote, payment: ReceiptPayment): Promise<StandaloneReceipt> {
  const problem = receiptReferenceError(payment.method, payment.reference);
  if (problem) throw new Error(problem);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.paidOn)) throw new Error('Pick the date it was paid');
  if (quote.totalCents <= 0) throw new Error('This quote has no total to receipt');

  const lines: StoredReceiptLine[] = quote.lineItems
    .filter((l) => l.title.trim())
    .map((l) => ({
      title: l.title.trim(),
      labor_cents: lineLaborCents(l, quote.laborRateCents),
      parts_cents: dollarsToCents(l.partsDollars),
      ...(l.hours && l.hours > 0 ? { hours: l.hours } : {}),
      ...(l.note?.trim() ? { note: l.note.trim() } : {}),
    }));
  const reference = normalizeReference(payment.method, payment.reference);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      quote_id: quote.id,
      customer_name: quote.customerName,
      customer_phone: quote.customerPhone,
      customer_email: quote.customerEmail,
      customer_address: quote.customerAddress,
      vehicle: quote.vehicle,
      vin: quote.vin,
      line_items: withPickupLine(lines, quote.partsPickupCents),
      labor_cents: quote.laborCents,
      // The table adds up labor + parts + tax: the pickup fee rides with the
      // parts (and is taxed with them), and line_items keeps it apart.
      parts_cents: quote.partsCents + quote.partsPickupCents,
      tax_mode: quote.taxMode,
      tax_rate_basis_points: quote.taxRateBasisPoints,
      tax_cents: quote.taxCents,
      total_cents: quote.totalCents,
      labor_rate_cents: quote.laborRateCents,
      payment_method: payment.method,
      payment_reference: reference || null,
      paid_on: payment.paidOn,
      notes: payment.notes?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (quote.status !== 'accepted') {
    await setQuoteStatus(quote.id, 'accepted').catch(() => undefined);
  }
  return rowToStandalone(data as Record<string, unknown>);
}

export async function fetchStandaloneReceipt(id: string): Promise<StandaloneReceipt | null> {
  const { data, error } = await supabase.from('receipts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToStandalone(data as Record<string, unknown>) : null;
}

export async function deleteStandaloneReceipt(id: string): Promise<void> {
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** The printable invoice for a receipt made from a quote. */
export function standaloneInvoiceDoc(r: StandaloneReceipt): InvoiceDoc {
  return {
    receipt: {
      referenceCode: r.receiptNumber,
      customerName: r.customerName,
      vehicle: r.vehicle || '',
      kind: 'charge',
      lineItems: r.lines.map((l) => ({ title: l.title, labor_cents: l.labor_cents, parts_cents: l.parts_cents })),
      diagnosticCents: 0,
      travelCents: 0,
      weatherCents: 0,
      partsPickupCents: r.partsPickupCents,
      taxCents: r.taxCents,
      taxMode: r.taxMode,
      totalCents: r.totalCents,
      signerName: null,
      paidAt: paidOnInstant(r.paidOn),
      businessPhone: SITE_PHONE_DISPLAY,
      siteUrl: SITE_ORIGIN,
      vin: r.vin,
      payment: {
        method: r.paymentMethod === 'card' || r.paymentMethod === 'cash' || r.paymentMethod === 'zelle' ? r.paymentMethod : 'in_person',
        cardLast4: r.paymentMethod === 'card' ? r.paymentReference : null,
      },
    },
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
    address: r.customerAddress,
    serviceDate: null,
    squarePaymentId: null,
    paidVia: paidViaText(r.paymentMethod, r.paymentReference),
    notes: r.notes,
  };
}
