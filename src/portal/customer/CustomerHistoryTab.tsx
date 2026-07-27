import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { openReceiptPrintWindow } from '../../services/receiptPdf';

type Props = { onBookService: () => void; customerId: string };

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
};

export const CustomerHistoryTab: React.FC<Props> = ({ onBookService, customerId }) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from('bookings')
        .select(
          'id, reference_code, vehicle_description, services, total_estimate, captured_amount_cents, payment_status, status, customer_name, customer_address, created_at'
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

  const printReceipt = (row: HistoryRow) => {
    const total =
      row.captured_amount_cents != null
        ? row.captured_amount_cents / 100
        : Number(row.total_estimate) || 0;
    openReceiptPrintWindow({
      referenceCode: row.reference_code,
      customerName: row.customer_name,
      vehicle: row.vehicle_description,
      services: row.services,
      totalDollars: total,
      paymentStatus: row.payment_status || row.status,
      dateLabel: new Date(row.created_at).toLocaleDateString(),
      address: row.customer_address,
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-white mb-3">Past services</h3>
        {loading && <p className="text-xs text-slate-500">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
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
                  onClick={() => printReceipt(row)}
                  className="text-[11px] font-bold text-orange-400 hover:underline"
                >
                  Receipt PDF →
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
          onClick={onBookService}
          className="w-full py-3 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold rounded-xl"
        >
          Schedule another mobile visit →
        </button>
      </section>
      <p className="text-[10px] text-slate-600">
        Receipt opens a print dialog — choose “Save as PDF” in your browser.
      </p>
    </div>
  );
};
