/** Standalone customer quotes — admin-only CRUD over public.quotes. */

import { supabase } from './supabaseClient';
import { SALES_TAX_BASIS_POINTS, salesTaxCents, type TaxMode } from './salesTax';

export type QuoteLine = {
  title: string;
  laborDollars: number;
  partsDollars: number;
  note?: string;
};

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  vehicle: string | null;
  lineItems: QuoteLine[];
  laborCents: number;
  partsCents: number;
  taxMode: TaxMode;
  taxRateBasisPoints: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  validUntil: string | null;
  status: QuoteStatus;
  createdAt: string;
};

export type QuoteDraft = {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  vehicle?: string;
  lineItems: QuoteLine[];
  taxMode: TaxMode;
  notes?: string;
  validUntil?: string | null;
  status?: QuoteStatus;
};

const dollarsToCents = (n: number) => Math.round((Number(n) || 0) * 100);

/**
 * Totals are computed here rather than trusted from the form, so the number on
 * the PDF, the number in the row and the number the customer is told are the
 * same arithmetic in one place.
 */
export function totalsFor(lineItems: QuoteLine[], taxMode: TaxMode) {
  const laborCents = lineItems.reduce((sum, l) => sum + dollarsToCents(l.laborDollars), 0);
  const partsCents = lineItems.reduce((sum, l) => sum + dollarsToCents(l.partsDollars), 0);
  const taxCents = salesTaxCents({ laborCents, partsCents, mode: taxMode });
  return {
    laborCents,
    partsCents,
    taxCents,
    totalCents: laborCents + partsCents + taxCents,
  };
}

function rowToQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as string,
    quoteNumber: row.quote_number as string,
    customerName: row.customer_name as string,
    customerPhone: (row.customer_phone as string) ?? null,
    customerEmail: (row.customer_email as string) ?? null,
    customerAddress: (row.customer_address as string) ?? null,
    vehicle: (row.vehicle as string) ?? null,
    lineItems: Array.isArray(row.line_items) ? (row.line_items as QuoteLine[]) : [],
    laborCents: (row.labor_cents as number) ?? 0,
    partsCents: (row.parts_cents as number) ?? 0,
    taxMode: (row.tax_mode as TaxMode) ?? 'parts',
    taxRateBasisPoints: (row.tax_rate_basis_points as number) ?? SALES_TAX_BASIS_POINTS,
    taxCents: (row.tax_cents as number) ?? 0,
    totalCents: (row.total_cents as number) ?? 0,
    notes: (row.notes as string) ?? null,
    validUntil: (row.valid_until as string) ?? null,
    status: (row.status as QuoteStatus) ?? 'draft',
    createdAt: row.created_at as string,
  };
}

export async function listQuotes(limit = 100): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToQuote);
}

export async function createQuote(draft: QuoteDraft): Promise<Quote> {
  const name = draft.customerName.trim();
  if (!name) throw new Error('Customer name is required');

  const lines = draft.lineItems.filter((l) => l.title.trim());
  if (!lines.length) throw new Error('Add at least one line item');

  const totals = totalsFor(lines, draft.taxMode);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      customer_name: name,
      customer_phone: draft.customerPhone?.trim() || null,
      customer_email: draft.customerEmail?.trim() || null,
      customer_address: draft.customerAddress?.trim() || null,
      vehicle: draft.vehicle?.trim() || null,
      line_items: lines,
      labor_cents: totals.laborCents,
      parts_cents: totals.partsCents,
      tax_mode: draft.taxMode,
      tax_rate_basis_points: SALES_TAX_BASIS_POINTS,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      notes: draft.notes?.trim() || null,
      valid_until: draft.validUntil || null,
      status: draft.status ?? 'draft',
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return rowToQuote(data as Record<string, unknown>);
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
