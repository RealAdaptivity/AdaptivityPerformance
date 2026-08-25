import React, { useCallback, useEffect, useState } from 'react';
import { fetchTechEarnings, type TechPayoutRow } from '../../services/techDispatch';
import { openWeeklyEarningsPrintWindow } from '../../services/weeklyEarningsPdf';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusLabel = (row: TechPayoutRow): { text: string; className: string } => {
  switch (row.status) {
    case 'paid':
      return { text: 'Paid', className: 'text-emerald-400' };
    case 'queued':
      return { text: 'In this week’s batch', className: 'text-amber-400' };
    case 'void':
      return { text: 'Reversed (job refunded)', className: 'text-slate-500' };
    default:
      return { text: 'Earned — awaiting payout', className: 'text-slate-300' };
  }
};

/**
 * A tech's earnings, from the tech_payouts ledger.
 *
 * This replaces the Stripe Connect version, and the change is not only
 * cosmetic: there is no cash-out button any more. Connect let a tech pull their
 * balance on demand, instantly for a fee. Helcim has no rail that moves money to
 * a third party, so payouts are batched and sent by the business.
 *
 * That is a real reduction in what techs can do, so the screen says so plainly
 * rather than quietly dropping the button and leaving people hunting for it.
 */
export const TechEarningsTab: React.FC = () => {
  const [rows, setRows] = useState<TechPayoutRow[]>([]);
  const [unpaidCents, setUnpaidCents] = useState(0);
  const [paidCents, setPaidCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchTechEarnings();
      setRows(summary.rows);
      setUnpaidCents(summary.unpaidCents);
      setPaidCents(summary.paidCents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load your earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Awaiting payout</p>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{money(unpaidCents)}</p>
        </div>
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Paid to date</p>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{money(paidCents)}</p>
        </div>
      </div>

      <div className="bg-slate-950/60 border border-white/10 rounded-xl p-3">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Your 70% share is recorded here as soon as a job is captured. Payouts go out in a weekly
          batch — you&apos;ll see the date and reference on each line once it&apos;s sent. Questions
          about a specific job? Call the shop with the booking reference.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-slate-400 animate-pulse">Loading your earnings…</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          No earnings yet. Completed jobs show up here once payment is captured.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="space-y-2">
            {rows.map((row) => {
              const label = statusLabel(row);
              return (
                <div
                  key={row.id}
                  className="bg-[#12141c] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-orange-400 truncate">
                      {row.bookingReference || '—'}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${label.className}`}>{label.text}</p>
                    {row.paidAt && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(row.paidAt).toLocaleDateString()}
                        {row.payoutMethod ? ` · ${row.payoutMethod}` : ''}
                        {row.externalReference ? ` · ${row.externalReference}` : ''}
                      </p>
                    )}
                  </div>
                  <p
                    className={`font-mono font-bold text-sm flex-shrink-0 ${
                      row.status === 'void' ? 'text-slate-600 line-through' : 'text-white'
                    }`}
                  >
                    {money(row.amountCents)}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              openWeeklyEarningsPrintWindow(
                rows.map((row) => ({
                  bookingReference: row.bookingReference,
                  techTransferCents: row.amountCents,
                  payoutStatus: row.status,
                  createdAt: row.earnedAt,
                }))
              )
            }
            className="w-full py-2.5 text-xs font-bold rounded-xl border border-white/10 text-slate-300 hover:bg-white/5"
          >
            Print weekly earnings summary
          </button>
        </>
      )}
    </div>
  );
};
