import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchBookingStatusCounts,
  fetchCancelNoShowReasonCounts,
  fetchCollectedByMethod,
  type CollectedByMethod,
  fetchPnLPaymentSums,
  type BookingStatusCounts,
  type PaymentStatusSums,
  type ReasonCounts,
} from '../services/adminAnalytics';
import {
  export1099Csv,
  exportPartnerReportCsv,
  fetchFraudFlags,
  type FraudFlag,
} from '../services/adminOpsExtras';
import { fetchDispatchTechs } from '../services/adminApi';

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
  const [payments, setPayments] = useState<PaymentStatusSums | null>(null);
  const [collected, setCollected] = useState<CollectedByMethod | null>(null);
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
      const [p, s, r, f, c] = await Promise.all([
        fetchPnLPaymentSums(30),
        fetchBookingStatusCounts(30),
        fetchCancelNoShowReasonCounts(90),
        fetchFraudFlags().catch(() => [] as FraudFlag[]),
        fetchCollectedByMethod(30).catch(() => null),
      ]);
      setCollected(c);
      setPayments(p);
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
      const techs = await fetchDispatchTechs();
      export1099Csv(techs, new Map());
      setExportMsg('1099 CSV downloaded');
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
  if (!payments) return null;

  const statusEntries = Object.entries(statuses).sort((a, b) => b[1] - a[1]);

  const methodName: Record<string, string> = { card: 'Card (Square)', cash: 'Cash', zelle: 'Zelle', in_person: 'In person, method not recorded' };

  return (
    <div className="space-y-4">
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

      <p className="text-xs text-slate-400">
        Last 30 days payments · platform ~30% / tech ~70% estimated from succeeded volume. Cancel /
        no-show reasons use last 90 days.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Succeeded / captured', value: money(payments.succeededCents), tone: 'text-emerald-400' },
          { label: 'Refunded', value: money(payments.refundedCents), tone: 'text-red-300' },
          {
            label: 'Platform est. (30%)',
            value: money(payments.platformEstimateCents),
            tone: 'text-orange-400',
          },
          { label: 'Tech est. (70%)', value: money(payments.techEstimateCents), tone: 'text-sky-300' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1"
          >
            <p className="text-[10px] uppercase font-bold text-slate-500">{card.label}</p>
            <p className={`text-xl font-extrabold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
          Bookings by status (30d) · {payments.paymentCount} payment rows
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
