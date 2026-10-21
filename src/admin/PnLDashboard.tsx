import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchBookingStatusCounts,
  fetchCancelNoShowReasonCounts,
  fetchCollectedByMethod,
  fetchReceiptsByMethod,
  type CollectedByMethod,
  type BookingStatusCounts,
  type ReasonCounts,
} from '../services/adminAnalytics';
import { summarizeMoneyIn, texasYear, type ReceiptsByMethod } from '../services/moneyIn';
import {
  export1099Csv,
  exportPartnerReportCsv,
  fetchFraudFlags,
  fetchTechPayForYear,
  techsForPay,
  type FraudFlag,
} from '../services/adminOpsExtras';
import { fetchDispatchTechs } from '../services/adminApi';
import { countUnconfirmedManualPayments } from '../services/jobPayments';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function ReasonTable({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">{title}</p>
        <p className="text-xs text-slate-600">None yet</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {entries.map(([reason, n]) => (
          <li key={reason} className="flex justify-between text-xs text-slate-300">
            <span className="font-mono text-slate-400">{reason}</span>
            <span className="font-bold text-white">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const PnLDashboard: React.FC = () => {
  /* The top used to read the Stripe-era payments table, which nothing has
     written to since card payments moved to Square in person; it showed $0.
     Money in now comes from jobs closed in the tech app plus receipts written
     here for walk-ins and quotes. */
  const [collected, setCollected] = useState<CollectedByMethod | null>(null);
  const [receipts, setReceipts] = useState<ReceiptsByMethod | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(0);
  const [statuses, setStatuses] = useState<BookingStatusCounts>({});
  const [reasons, setReasons] = useState<ReasonCounts | null>(null);
  const [fraud, setFraud] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, f, c, rc, u] = await Promise.all([
        fetchBookingStatusCounts(30),
        fetchCancelNoShowReasonCounts(90),
        fetchFraudFlags().catch(() => [] as FraudFlag[]),
        fetchCollectedByMethod(30).catch(() => null),
        fetchReceiptsByMethod(30).catch(() => null),
        countUnconfirmedManualPayments(),
      ]);
      setUnconfirmed(u);
      setCollected(c);
      setReceipts(rc);
      setStatuses(s);
      setReasons(r);
      setFraud(f);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handle1099Export = async () => {
    setExportMsg(null);
    try {
      const year = texasYear();
      const [techs, pay] = await Promise.all([fetchDispatchTechs(), fetchTechPayForYear(year)]);
      export1099Csv(await techsForPay(techs, pay), pay, year);
      setExportMsg(`1099 CSV for ${year} downloaded: tech pay from jobs closed this year.`);
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Export failed');
    }
  };

  if (loading) return <p className="text-xs text-slate-500">Loading P&L…</p>;
  if (error) {
    return (
      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        {error}
      </p>
    );
  }
  const money30 = summarizeMoneyIn(collected, receipts);
  const statusEntries = Object.entries(statuses).sort((a, b) => b[1] - a[1]);

  const methodName: Record<string, string> = { card: 'Card (Square)', cash: 'Cash', zelle: 'Zelle', in_person: 'In person, method not recorded' };
  const receiptMethodName: Record<string, string> = { card: 'Card', cash: 'Cash', zelle: 'Zelle', check: 'Check', other: 'Other' };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Last 30 days. Money in is jobs closed in the tech app plus walk-in and quote receipts, less refunds. Cancel and
        no-show reasons cover the last 90 days.
      </p>

      {unconfirmed > 0 && (
        <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {unconfirmed} cash or in-person payment{unconfirmed === 1 ? '' : 's'} not confirmed yet. Open the job in
          Dispatch and confirm how it was paid.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Money in', value: money(money30.totalInCents), tone: 'text-emerald-400' },
          { label: 'Walk-in & quote receipts', value: money(money30.receiptsCents), tone: 'text-emerald-300' },
          { label: 'Paid to techs', value: money(money30.techPayoutCents), tone: 'text-sky-300' },
          { label: 'Kept, before expenses', value: money(money30.keptCents), tone: 'text-orange-400' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-500">{card.label}</p>
            <p className={`text-xl font-extrabold tabular-nums ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {collected && (
        <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500">
            Collected at jobs · last 30 days · by payment method
          </p>
          {collected.rows.length === 0 ? (
            <p className="text-xs text-slate-500">No jobs closed in the tech app in the last 30 days.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500">
                  <th className="text-left font-bold py-1">Method</th>
                  <th className="text-right font-bold py-1">Jobs</th>
                  <th className="text-right font-bold py-1">Collected</th>
                </tr>
              </thead>
              <tbody>
                {collected.rows.map((r) => (
                  <tr key={r.method} className="border-t border-white/5">
                    <td className="py-1.5 text-slate-200">{methodName[r.method]}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-300">{r.jobs}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-200">{money(r.cents)}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 font-bold">
                  <td className="py-1.5 text-white">Total</td>
                  <td className="py-1.5 text-right tabular-nums text-white">{collected.rows.reduce((n, r) => n + r.jobs, 0)}</td>
                  <td className="py-1.5 text-right tabular-nums text-white">{money(collected.totalCents)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="text-[11px] text-slate-500">
            Refunded through Square: <span className="text-slate-300">{money(collected.refundedCents)}</span> · Paid to
            techs: <span className="text-slate-300">{money(collected.techPayoutCents)}</span>
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
        <p className="text-[10px] uppercase font-bold text-slate-500">
          Walk-in &amp; quote receipts · last 30 days · by payment method
        </p>
        {!receipts || receipts.rows.length === 0 ? (
          <p className="text-xs text-slate-500">No receipts written in the last 30 days.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-slate-500">
                <th className="text-left font-bold py-1">Method</th>
                <th className="text-right font-bold py-1">Receipts</th>
                <th className="text-right font-bold py-1">Collected</th>
              </tr>
            </thead>
            <tbody>
              {receipts.rows.map((r) => (
                <tr key={r.method} className="border-t border-white/5">
                  <td className="py-1.5 text-slate-200">{receiptMethodName[r.method]}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-300">{r.count}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-200">{money(r.cents)}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 font-bold">
                <td className="py-1.5 text-white">Total</td>
                <td className="py-1.5 text-right tabular-nums text-white">{receipts.rows.reduce((n, r) => n + r.count, 0)}</td>
                <td className="py-1.5 text-right tabular-nums text-white">{money(receipts.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
          Bookings by status (30d)
        </p>
        {statusEntries.length === 0 ? (
          <p className="text-xs text-slate-600">No bookings in window</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {statusEntries.map(([status, n]) => (
              <span
                key={status}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 bg-[#0b0c10] text-slate-300"
              >
                {status.replace('_', ' ')}{' '}
                <span className="text-orange-400">{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {reasons && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
            <ReasonTable
              title={`Cancel reasons (${reasons.cancelTotal})`}
              counts={reasons.cancel}
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
            <ReasonTable
              title={`No-show reasons (${reasons.noShowTotal})`}
              counts={reasons.noShow}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
        <p className="text-[10px] uppercase font-bold text-slate-500">Exports</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handle1099Export()}
            className="text-xs font-bold text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-2"
          >
            1099-NEC CSV
          </button>
          <button
            type="button"
            onClick={() =>
              void exportPartnerReportCsv()
                .then(() => setExportMsg('Partner CSV downloaded'))
                .catch((e) => setExportMsg(e instanceof Error ? e.message : 'Export failed'))
            }
            className="text-xs font-bold text-sky-300 border border-sky-500/30 rounded-lg px-3 py-2"
          >
            Partner report CSV
          </button>
        </div>
        {exportMsg && <p className="text-[11px] text-slate-400">{exportMsg}</p>}
      </div>

      {fraud.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500">Fraud / trust flags</p>
          <ul className="space-y-1.5">
            {fraud.slice(0, 8).map((f) => (
              <li key={f.key} className="text-xs text-slate-300">
                <span className="font-bold text-amber-300">{f.label}</span> — {f.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
