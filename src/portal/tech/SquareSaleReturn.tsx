import React, { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import type { DispatchBooking } from '../../services/techDispatch';
import { formatCents } from '../../services/closeOut';
import {
  clearPendingSale,
  loadPendingSale,
  recordSquareSale,
  type PendingSquareSale,
  type SquareReturn,
} from '../../services/squarePointOfSale';
import { ReceiptSender } from './TechPayScreen';

/**
 * The phone is back from Square Point of Sale. On success, check the sale with
 * Square and close the job (retry is safe — the card is never charged again);
 * then offer the receipt. On a cancel or error, say so and go back to the job.
 */
export const SquareSaleReturn: React.FC<{
  result: SquareReturn;
  jobFor: (bookingId: string) => DispatchBooking | undefined;
  onClosed: () => void;
  onDone: (bookingId: string | null) => void;
}> = ({ result, jobFor, onClosed, onDone }) => {
  const [pending] = useState<PendingSquareSale | null>(() => {
    const p = loadPendingSale();
    return p && (!result.bookingId || p.bookingId === result.bookingId) ? p : null;
  });
  const [state, setState] = useState<'saving' | 'closed' | 'failed'>(result.ok ? 'saving' : 'failed');
  const [error, setError] = useState<string | null>(result.ok ? null : result.message);
  const [closed, setClosed] = useState<{ total: number; payout: number } | null>(null);

  const finish = useCallback(async () => {
    if (!result.ok) return;
    if (!pending) {
      setState('failed');
      setError(
        `Square took the payment (sale ${result.transactionId}), but this phone no longer has the job’s receipt. Tell dispatch so they can close the job from the sale.`
      );
      return;
    }
    setState('saving');
    setError(null);
    try {
      const saved = await recordSquareSale(pending, result.transactionId);
      clearPendingSale();
      setClosed({ total: saved.totalCents, payout: saved.techPayoutCents });
      setState('closed');
      onClosed();
    } catch (e) {
      setState('failed');
      setError(
        `${e instanceof Error ? e.message : 'Could not close the job.'} The card was charged — try again; it won’t be charged twice.`
      );
    }
  }, [result, pending, onClosed]);

  useEffect(() => {
    void finish();
    // Run once for this return from Square.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingId = pending?.bookingId ?? result.bookingId;
  const job = bookingId ? jobFor(bookingId) : undefined;

  if (state === 'closed' && closed) {
    return (
      <div className="space-y-5 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Check className="h-7 w-7 text-emerald-300" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">Paid by card · {formatCents(closed.total)}</h2>
          <p className="mt-1 text-[15px] text-emerald-200">Job closed. Your payout: {formatCents(closed.payout)}</p>
        </div>
        {job ? <ReceiptSender job={job} onDone={() => onDone(null)} /> : (
          <button type="button" onClick={() => onDone(null)} className="min-h-[48px] w-full rounded-xl bg-brand font-bold text-white">
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15">
        <CreditCard className="h-7 w-7 text-brand" aria-hidden="true" />
      </div>
      {state === 'saving' ? (
        <div>
          <h2 className="font-heading text-2xl font-bold">Checking the payment with Square…</h2>
          <p className="mt-1 text-[15px] text-slate-400">
            {pending ? `${pending.referenceCode} · ${formatCents(pending.totalCents)}` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-bold">{result.ok ? 'Job not closed yet' : 'Card not charged'}</h2>
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
          {result.ok && pending && (
            <button type="button" onClick={() => void finish()} className="min-h-[52px] w-full rounded-xl bg-brand font-bold text-white">
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => onDone(result.ok ? null : bookingId)}
            className="min-h-[48px] w-full rounded-xl border border-white/10 font-semibold text-slate-200"
          >
            {result.ok ? 'Back to my jobs' : 'Back to Get paid'}
          </button>
        </div>
      )}
    </div>
  );
};
