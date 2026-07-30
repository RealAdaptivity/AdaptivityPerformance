import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchSubmittedPartsExpenseClaims,
  reviewPartsExpenseClaim,
  type PartsExpenseClaim,
} from '../services/partsExpenses';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export const PartsExpensesAdmin: React.FC = () => {
  const [rows, setRows] = useState<PartsExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchSubmittedPartsExpenseClaims());
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    setMessage(null);
    try {
      await reviewPartsExpenseClaim(id, status);
      setMessage(status === 'approved' ? 'Claim approved.' : 'Claim rejected.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-xs text-slate-500">Loading parts expense claims…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Tech-submitted parts reimbursements awaiting admin review.
      </p>
      {message && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {rows.length === 0 && (
        <p className="text-xs text-slate-500 py-6 text-center">No submitted claims.</p>
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2 text-sm"
        >
          <div className="flex justify-between gap-2">
            <p className="font-bold text-white">{money(row.amountCents)}</p>
            <span className="text-[10px] font-bold uppercase text-amber-400">{row.status}</span>
          </div>
          <p className="text-xs text-slate-300">{row.description}</p>
          <p className="text-[11px] text-slate-500 font-mono">
            Booking {row.bookingId.slice(0, 8)}… · Tech {row.techId.slice(0, 8)}…
          </p>
          {row.receiptPath && (
            <p className="text-[10px] text-slate-600 truncate">Receipt: {row.receiptPath}</p>
          )}
          <p className="text-[10px] text-slate-600">
            Submitted {new Date(row.createdAt).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => void review(row.id, 'approved')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => void review(row.id, 'rejected')}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 text-xs font-bold disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
