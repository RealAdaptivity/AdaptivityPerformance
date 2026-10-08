import { supabase } from './supabaseClient';
import type { PaymentMethod, ReceiptInput, ReceiptLine } from './receiptMessage';
import { SITE_ORIGIN, SITE_PHONE_DISPLAY } from '../site/seo';

/** Everything the printable invoice shows for a closed job. */
export type InvoiceDoc = {
  receipt: ReceiptInput;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  /** 'YYYY-MM-DD' the visit was booked for, when it was. */
  serviceDate: string | null;
  squarePaymentId: string | null;
};

type BookingRow = {
  reference_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  vehicle_description: string | null;
  vin: string | null;
  preferred_date: string | null;
  mechanic?: { full_name: string | null } | { full_name: string | null }[] | null;
};

/**
 * The invoice for a closed job, built from the stored job_payments row (the
 * same numbers the text and email receipts use). Null when the job has not
 * been closed in the tech app — older jobs fall back to the quote-based
 * receipt.
 */
export async function loadInvoice(bookingId: string): Promise<InvoiceDoc | null> {
  const [{ data: booking, error: bErr }, { data: paid, error: pErr }] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'reference_code, customer_name, customer_phone, customer_email, customer_address, vehicle_description, vin, preferred_date, mechanic:profiles!bookings_mechanic_id_fkey ( full_name )'
      )
      .eq('id', bookingId)
      .maybeSingle(),
    supabase
      .from('job_payments')
      .select(
        'kind, line_items, diagnostic_cents, travel_cents, weather_cents, discount_cents, tax_cents, tax_mode, total_cents, signer_name, tech_notes, created_at, payment_method, card_brand, card_last4, square_payment_id, refunded_cents'
      )
      .eq('booking_id', bookingId)
      .maybeSingle(),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (pErr) throw new Error(pErr.message);
  if (!booking || !paid) return null;

  const b = booking as unknown as BookingRow;
  const mech = Array.isArray(b.mechanic) ? b.mechanic[0] : b.mechanic;
  const method = String(paid.payment_method ?? 'in_person');
  const lines: ReceiptLine[] = (Array.isArray(paid.line_items) ? paid.line_items : []).map(
    (l: { title?: unknown; labor_cents?: unknown; parts_cents?: unknown }) => ({
      title: String(l.title ?? ''),
      labor_cents: Number(l.labor_cents) || 0,
      parts_cents: Number(l.parts_cents) || 0,
    })
  );

  return {
    receipt: {
      referenceCode: b.reference_code,
      customerName: b.customer_name || 'Customer',
      vehicle: b.vehicle_description || '',
      kind: paid.kind === 'diagnostic_only' || paid.kind === 'no_show' ? paid.kind : 'charge',
      lineItems: lines,
      diagnosticCents: Number(paid.diagnostic_cents) || 0,
      travelCents: Number(paid.travel_cents) || 0,
      weatherCents: Number(paid.weather_cents) || 0,
      discountCents: Number(paid.discount_cents) || 0,
      taxCents: Number(paid.tax_cents) || 0,
      taxMode: paid.tax_mode === 'total' || paid.tax_mode === 'none' ? paid.tax_mode : 'parts',
      totalCents: Number(paid.total_cents) || 0,
      signerName: (paid.signer_name as string | null) ?? null,
      paidAt: String(paid.created_at),
      techNotes: (paid.tech_notes as string | null) ?? null,
      businessPhone: SITE_PHONE_DISPLAY,
      siteUrl: SITE_ORIGIN,
      vin: b.vin,
      techName: mech?.full_name ?? null,
      payment: {
        method: (['card', 'cash', 'zelle'].includes(method) ? method : 'in_person') as PaymentMethod,
        cardBrand: (paid.card_brand as string | null) ?? null,
        cardLast4: (paid.card_last4 as string | null) ?? null,
      },
      refundedCents: Number(paid.refunded_cents) || 0,
    },
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
    address: b.customer_address,
    serviceDate: b.preferred_date,
    squarePaymentId: (paid.square_payment_id as string | null) ?? null,
  };
}
