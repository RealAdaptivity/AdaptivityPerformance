import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { openReceiptPrintWindow } from '../../services/receiptPdf';
import { openReceiptEmail } from '../../services/receiptEmail';
import { addFavoriteTech, submitWarrantyClaim } from '../../services/customerExtras';

export type RebookPrefill = {
  vehicleDescription?: string;
  services?: string[];
  preferredMechanicId?: string;
};

type Props = {
  onBookService: (prefill?: RebookPrefill) => void;
  customerId: string;
};

type HistoryRow = {
  id: string;
  reference_code: string;
  vehicle_description: string;
  services: string[];
  total_estimate: number;
  captured_amount_cents: number | null;
  payment_status: string | null;
  status: string;
  customer_name: string;
  customer_address: string;
  created_at: string;
  mechanic_id: string | null;
  active_quote_id: string | null;
};

type QuoteLine = {
  title?: string;
  labor_cents?: number;
  parts_cents?: number;
  notes?: string;
};

export const CustomerHistoryTab: React.FC<Props> = ({ onBookService, customerId }) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from('bookings')
        .select(
          'id, reference_code, vehicle_description, services, total_estimate, captured_amount_cents, payment_status, status, customer_name, customer_address, created_at, mechanic_id, active_quote_id'
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setRows([]);
      } else {
        setRows(
          (data || []).map((r) => ({
            ...r,
            services: Array.isArray(r.services) ? (r.services as string[]) : [],
          })) as HistoryRow[]
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const receiptData = async (row: HistoryRow) => {
    const total =
      row.captured_amount_cents != null
        ? row.captured_amount_cents / 100
        : Number(row.total_estimate) || 0;

    let lineItems:
      | {
          title: string;
          amountDollars?: number;
          laborDollars?: number;
          partsDollars?: number;
          note?: string;
        }[]
      | undefined;
    let diagnosticDollars: number | undefined;
    let repairsDollars: number | undefined;
    let techNotes: string | undefined;

    if (row.active_quote_id) {
      const { data: quote } = await supabase
        .from('booking_quotes')
        .select('line_items, diagnostic_fee_cents, repairs_cents, tech_notes')
        .eq('id', row.active_quote_id)
        .maybeSingle();
      const raw = Array.isArray(quote?.line_items) ? (quote!.line_items as QuoteLine[]) : [];
      lineItems = raw
        .filter((l) => String(l.title || '').trim())
        .map((l) => {
          const labor = (Number(l.labor_cents) || 0) / 100;
          const parts = (Number(l.parts_cents) || 0) / 100;
          return {
            title: String(l.title).trim(),
            laborDollars: labor,
            partsDollars: parts,
            amountDollars: labor + parts,
            note: l.notes ? String(l.notes) : undefined,
          };
        });
      if (quote?.diagnostic_fee_cents != null) diagnosticDollars = Number(quote.diagnostic_fee_cents) / 100;
      if (quote?.repairs_cents != null) repairsDollars = Number(quote.repairs_cents) / 100;
      if (quote?.tech_notes) techNotes = String(quote.tech_notes);
    }

    return {
      referenceCode: row.reference_code,
      customerName: row.customer_name,
      vehicle: row.vehicle_description,
      services: row.services,
      totalDollars: total,
      paymentStatus: row.payment_status || row.status,
      dateLabel: new Date(row.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      address: row.customer_address,
      lineItems,
      diagnosticDollars,
      repairsDollars,
      techNotes,
    };
  };

  const handleWarranty = async (row: HistoryRow) => {
    const description = window.prompt(
      'Describe the warranty issue (what failed, when you noticed it):'
    );
    if (!description?.trim()) return;
    setMsg(null);
    try {
      await submitWarrantyClaim(row.id, description);
      setMsg(`Warranty claim opened for ${row.reference_code}. We’ll follow up.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not submit claim');
    }
  };

  const handleFavorite = async (row: HistoryRow) => {
    if (!row.mechanic_id) {
      setMsg('No technician on this job to save.');
      return;
    }
    try {
      await addFavoriteTech(row.mechanic_id);
      setMsg('Technician saved — request them next time you book.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save tech');
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-white mb-3">Past services</h3>
        {loading && <p className="text-xs text-slate-500">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {msg && <p className="text-xs text-emerald-400">{msg}</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-slate-500">No bookings yet. Book a service to see history here.</p>
        )}
        {rows.map((row) => {
          const total =
            row.captured_amount_cents != null
              ? row.captured_amount_cents / 100
              : Number(row.total_estimate) || 0;
          return (
            <div
              key={row.id}
              className="bg-[#12141c] border border-white/10 rounded-xl p-3 mb-2 flex justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{row.vehicle_description}</p>
                <p className="text-[11px] text-slate-500">
                  {new Date(row.created_at).toLocaleDateString()} · {row.reference_code} ·{' '}
                  {row.status.replace('_', ' ')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {row.services.slice(0, 3).join(' · ') || 'Service'}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-bold text-emerald-400">${total.toFixed(2)}</p>
                <button
                  type="button"
                  onClick={() =>
                    onBookService({
                      vehicleDescription: row.vehicle_description,
                      services: row.services,
                      preferredMechanicId: row.mechanic_id || undefined,
                    })
                  }
                  className="block w-full text-[11px] font-bold text-orange-300 hover:underline"
                >
                  Rebook →
                </button>
                {row.status === 'COMPLETED' && row.mechanic_id && (
                  <button
                    type="button"
                    onClick={() => void handleFavorite(row)}
                    className="block w-full text-[11px] font-bold text-sky-300 hover:underline"
                  >
                    Save tech
                  </button>
                )}
                {row.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => void handleWarranty(row)}
                    className="block w-full text-[11px] font-bold text-amber-300 hover:underline"
                  >
                    Warranty claim
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        openReceiptPrintWindow(await receiptData(row));
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : 'Could not open receipt');
                      }
                    })();
                  }}
                  className="block w-full text-[11px] font-bold text-orange-400 hover:underline"
                >
                  Receipt PDF →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        openReceiptEmail(await receiptData(row));
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : 'Could not open email receipt');
                      }
                    })();
                  }}
                  className="block w-full text-[11px] font-bold text-slate-400 hover:underline"
                >
                  Email receipt →
                </button>
              </div>
            </div>
          );
        })}
      </section>
      <section>
        <h3 className="text-sm font-bold text-white mb-3">Book again</h3>
        <button
          type="button"
          onClick={() => onBookService()}
          className="w-full py-3 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold rounded-xl"
        >
          Schedule another mobile visit →
        </button>
      </section>
      <p className="text-[10px] text-slate-600">
        Receipt PDF opens print dialog. Email opens your mail app with a plain-text copy.
      </p>
    </div>
  );
};
