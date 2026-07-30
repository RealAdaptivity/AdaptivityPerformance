import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchPartnerPayoutReport,
  type PartnerPayoutRow,
} from '../services/adminAnalytics';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export const PartnerReport: React.FC = () => {
  const [rows, setRows] = useState<PartnerPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPartnerPayoutReport());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load partner report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-xs text-slate-500">Loading partner payout report…</p>;
  if (error) {
    return (
      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Partner locations · booking volume and related payment sums (30 / 90 days).
      </p>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#12141c]">
        <table className="w-full text-left text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-bold">Partner</th>
              <th className="px-3 py-2 font-bold text-right">Jobs 30d</th>
              <th className="px-3 py-2 font-bold text-right">$ 30d</th>
              <th className="px-3 py-2 font-bold text-right">Jobs 90d</th>
              <th className="px-3 py-2 font-bold text-right">$ 90d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No partner locations
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="text-slate-300">
                  <td className="px-3 py-2">
                    <p className="font-bold text-white">{r.businessName}</p>
                    <p className="text-[10px] text-slate-500">
                      {[r.city, r.zipCode].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{r.bookings30}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{money(r.paymentCents30)}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.bookings90}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{money(r.paymentCents90)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
