import React, { useCallback, useEffect, useState } from 'react';
import {
  captureBookingPayment,
  fetchTechPayoutHistory,
  fetchTechPayoutPreview,
  triggerInstantCashOut,
  type TechPayoutPreview,
  type TechPayoutRow,
} from '../../services/techDispatch';
import { countsTowardLedgerPending, formatTechPayoutLabel } from '../../services/payoutStatusLabels';
import { openWeeklyEarningsPrintWindow } from '../../services/weeklyEarningsPdf';

type CashOutChoice = 'instant' | 'standard';

export const TechEarningsTab: React.FC = () => {
  const [rows, setRows] = useState<TechPayoutRow[]>([]);
  const [preview, setPreview] = useState<TechPayoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashing, setCashing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const [method, setMethod] = useState<CashOutChoice>('standard');

  const [retryRef, setRetryRef] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const needsTransferRetry = (row: TechPayoutRow) =>
    row.paymentStatus === 'succeeded' &&
    !['pending', 'instant_paid', 'paid', 'instant_pending', 'standard_pending'].includes(row.payoutStatus);

  const retryTransfer = async (reference: string) => {
    setRetryRef(reference);
    setMsg(null);
    setMsgIsError(false);
    try {
      const r = await captureBookingPayment(reference);
      if (r.transferWarning) {
        setMsgIsError(true);
        setMsg(r.transferWarning);
      } else {
        setMsg(
          r.transferId
            ? `Transfer sent ($${r.techPayoutDollars?.toFixed(2) ?? '0'}) — balance should update shortly.`
            : 'Transfer request completed.'
        );
      }
      await load();
    } catch (e: unknown) {
      setMsgIsError(true);
      setMsg(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setRetryRef(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setPreviewError(null);
    try {
      const history = await fetchTechPayoutHistory();
      setRows(history);
      try {
        const p = await fetchTechPayoutPreview();
        setPreview(p);
        if (p.canStandardCashOut) setMethod('standard');
        else if (p.canInstantCashOut) setMethod('instant');
      } catch (e: unknown) {
        setPreview(null);
        setPreviewError(e instanceof Error ? e.message : 'Could not load Stripe balance');
      }
    } catch {
      setRows([]);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ledgerPending =
    rows
      .filter(
        (r) =>
          r.techTransferCents &&
          countsTowardLedgerPending(r.payoutStatus, r.paymentStatus)
      )
      .reduce((s, r) => s + (r.techTransferCents ?? 0), 0) / 100;

  const availableDollars = preview?.availableDollars ?? (preview?.availableCents ?? 0) / 100;
  const instantDollars = preview?.instantEligibleDollars ?? preview?.cashOutEligibleDollars ?? 0;
  const connectTotal = preview?.connectTotalDollars ?? 0;
  const pendingOnConnect = preview?.pendingDollars ?? 0;

  const canRun =
    method === 'instant' ? preview?.canInstantCashOut === true : preview?.canStandardCashOut === true;

  const cashOut = async () => {
    setCashing(true);
    setMsg(null);
    setMsgIsError(false);
    try {
      const r = await triggerInstantCashOut(method);
      const paid =
        typeof r.amountDollars === 'number' ? ` $${r.amountDollars.toFixed(2)}` : '';
      setMsg(r.message || `Cash out${paid} started.`);
      // Stripe balance can lag a beat after payout create
      await new Promise((res) => setTimeout(res, 800));
      await load();
    } catch (e: unknown) {
      setMsgIsError(true);
      setMsg(e instanceof Error ? e.message : 'Cash out failed — link Stripe in Settings');
    } finally {
      setCashing(false);
    }
  };

  const heroCashable =
    method === 'instant' ? Math.max(instantDollars, availableDollars) : availableDollars;

  const openWeeklyPdf = () => {
    try {
      openWeeklyEarningsPrintWindow(rows);
    } catch (e: unknown) {
      setMsgIsError(true);
      setMsg(e instanceof Error ? e.message : 'Could not open weekly PDF');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-slate-400">
          {method === 'instant' ? 'Cashable Instant (approx.)' : 'Available for bank cash out'}
        </p>
        <p className="text-3xl font-extrabold text-emerald-400">
          {loading ? '—' : `$${heroCashable.toFixed(2)}`}
        </p>
        {!loading && (
          <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
            <p>
              On Connect total: ${connectTotal.toFixed(2)}
              {pendingOnConnect > 0
                ? ` · settling $${pendingOnConnect.toFixed(2)} (not Instant-cashable yet)`
                : ''}
            </p>
            <p>Settled available (bank / Standard): ${availableDollars.toFixed(2)}</p>
          </div>
        )}
        {preview?.stripeAccountId && (
          <p className="text-[10px] font-mono text-slate-600 mt-1 truncate">{preview.stripeAccountId}</p>
        )}
        {previewError && <p className="text-[11px] text-red-400 mt-1">{previewError}</p>}
        <p className="text-[11px] text-slate-500 mt-1">
          Ledger pending (70% share): ${loading ? '—' : ledgerPending.toFixed(2)}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-300">How do you want to get paid?</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Your 70% job share lands on Stripe Connect first. Then you cash out with one of these:
          </p>
          <label
            className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer ${
              method === 'standard' ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10'
            }`}
          >
            <input
              type="radio"
              name="cashout"
              checked={method === 'standard'}
              onChange={() => setMethod('standard')}
              className="mt-1"
            />
            <span>
              <span className="block text-xs font-bold text-white">Standard — bank deposit</span>
              <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Arrives in about <strong className="text-slate-300">2 business days</strong>. Goes to your linked{' '}
                <strong className="text-slate-300">bank account</strong>.{' '}
                <strong className="text-emerald-400/90">No Stripe Instant fee</strong> — best if you’re not in a rush.
                Available now: ${availableDollars.toFixed(2)}.
              </span>
            </span>
          </label>
          <label
            className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer ${
              method === 'instant' ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10'
            } ${!preview?.hasDebitCardForInstant ? 'opacity-70' : ''}`}
          >
            <input
              type="radio"
              name="cashout"
              checked={method === 'instant'}
              onChange={() => setMethod('instant')}
              className="mt-1"
            />
            <span>
              <span className="block text-xs font-bold text-white">Instant — debit card</span>
              <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Usually arrives in about <strong className="text-slate-300">30 minutes</strong> on your{' '}
                <strong className="text-slate-300">debit card</strong>. Stripe charges about{' '}
                <strong className="text-amber-300/90">1% Instant fee</strong> (min ~$0.50) — e.g. $300 → ~$3 fee, ~$297
                to your card. Needs a debit card in Settings. Up to ${instantDollars.toFixed(2)}.
              </span>
            </span>
          </label>
        </div>

        {preview?.hint && (
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">{preview.hint}</p>
        )}

        <button
          type="button"
          disabled={cashing || loading || !canRun}
          onClick={() => void cashOut()}
          className="w-full mt-4 py-3 bg-orange-500 rounded-xl text-xs font-bold text-white disabled:opacity-60"
        >
          {cashing
            ? 'Processing…'
            : method === 'instant'
              ? '⚡ Cash out Instant'
              : 'Cash out to bank (no Instant fee)'}
        </button>

        {!loading && method === 'instant' && !preview?.hasDebitCardForInstant && (
          <p className="text-[11px] text-amber-400/90 mt-2">
            Add a debit card in Settings → Update payout setup to use Instant.
          </p>
        )}
        {!loading && method === 'standard' && availableDollars <= 0 && preview?.stripeOnboarded && (
          <p className="text-[11px] text-amber-400/90 mt-2">
            No settled balance yet for standard bank cash out. Wait for settlement or use Instant with a debit card.
          </p>
        )}
        {msg && (
          <p className={`text-[11px] mt-2 ${msgIsError ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Recent job payouts</h3>
        <button
          type="button"
          onClick={openWeeklyPdf}
          disabled={loading}
          className="px-3 py-1.5 bg-orange-500/90 rounded-lg text-[10px] font-bold text-white disabled:opacity-60"
        >
          Weekly summary PDF
        </button>
      </div>
      {rows.length === 0 && !loading && <p className="text-xs text-slate-500">Completed captures appear here.</p>}
      {rows.map((row) => (
        <div key={row.id} className="bg-[#12141c] border border-white/10 rounded-xl p-3 text-xs gap-2">
          <div className="flex justify-between gap-2">
            <span className="text-slate-300 min-w-0">
              {row.bookingReference ?? 'Job'}
              <span className="block text-[10px] text-slate-500 mt-0.5">
                {formatTechPayoutLabel(row.payoutStatus, row.paymentStatus)}
              </span>
              {row.payoutError && (
                <span className="block text-[10px] text-amber-400/90 mt-1 leading-relaxed">{row.payoutError}</span>
              )}
            </span>
            <span className="font-bold text-emerald-400 shrink-0">${((row.techTransferCents ?? 0) / 100).toFixed(2)}</span>
          </div>
          {row.bookingReference && needsTransferRetry(row) && (
            <button
              type="button"
              disabled={retryRef === row.bookingReference}
              onClick={() => void retryTransfer(row.bookingReference!)}
              className="mt-2 w-full py-2 border border-orange-500/40 text-orange-400 rounded-lg text-[10px] font-bold disabled:opacity-60"
            >
              {retryRef === row.bookingReference ? 'Retrying…' : 'Retry transfer to Connect'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
