import React, { useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { confirmManualPayment } from '../services/jobPayments';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * For a job closed as cash, Zelle or "in person": an admin records how it was
 * actually paid. Zelle needs the confirmation number from the bank app; cash
 * needs what was handed over (at least the amount due). The database refuses
 * card payments, no-shows and anything short.
 */
export const ConfirmManualPayment: React.FC<{
  bookingId: string;
  dueCents: number;
  /** Shown as the tech method when the tech recorded one. */
  recordedMethod: 'cash' | 'zelle' | 'in_person';
  tech?: { id: string; name: string } | null;
  onConfirmed: () => void;
}> = ({ bookingId, dueCents, recordedMethod, tech, onConfirmed }) => {
  const [method, setMethod] = useState<'cash' | 'zelle'>(recordedMethod === 'zelle' ? 'zelle' : 'cash');
  const [cashDollars, setCashDollars] = useState((dueCents / 100).toFixed(2));
  const [zelleConf, setZelleConf] = useState('');
  const [zelleSender, setZelleSender] = useState('');
  const [receivedBy, setReceivedBy] = useState<'tech' | 'me'>(tech ? 'tech' : 'me');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const receivedById = receivedBy === 'tech' && tech ? tech.id : null;
    if (method === 'zelle' && !zelleConf.trim()) {
      setError('Enter the Zelle confirmation number from the bank app.');
      return;
    }
    const cashCents = Math.round(Number(cashDollars) * 100);
    if (method === 'cash' && (!Number.isFinite(cashCents) || cashCents < dueCents)) {
      setError(`Cash received has to be at least ${money(dueCents)}.`);
      return;
    }
    setBusy(true);
    try {
      await confirmManualPayment(
        bookingId,
        method === 'cash'
          ? { method: 'cash', cashReceivedCents: cashCents, receivedBy: receivedById }
          : { method: 'zelle', zelleConfirmation: zelleConf, zelleSenderName: zelleSender, receivedBy: receivedById }
      );
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the payment');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm';
  const seg = (on: boolean) =>
    `flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${on ? 'bg-emerald-600 text-white' : 'border border-white/10 text-slate-300'}`;

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 space-y-2">
      <p className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
        <Banknote className="w-3.5 h-3.5" /> Not confirmed yet: how was it paid?
      </p>
      <div className="flex gap-2" role="group" aria-label="Paid by">
        <button type="button" className={seg(method === 'cash')} aria-pressed={method === 'cash'} onClick={() => setMethod('cash')}>
          Cash
        </button>
        <button type="button" className={seg(method === 'zelle')} aria-pressed={method === 'zelle'} onClick={() => setMethod('zelle')}>
          Zelle
        </button>
      </div>
      {method === 'cash' ? (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Cash received ($), due {money(dueCents)}</span>
          <input
            className={input}
            inputMode="decimal"
            value={cashDollars}
            onChange={(e) => setCashDollars(e.target.value)}
            aria-label="Cash received"
          />
        </label>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Zelle confirmation number</span>
            <input className={input} value={zelleConf} onChange={(e) => setZelleConf(e.target.value)} aria-label="Zelle confirmation number" />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Sent by (optional)</span>
            <input className={input} value={zelleSender} onChange={(e) => setZelleSender(e.target.value)} aria-label="Zelle sender name" />
          </label>
        </>
      )}
      <label className="block space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-500">Who took the money</span>
        <select className={input} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value as 'tech' | 'me')} aria-label="Who took the money">
          {tech && <option value="tech">{tech.name} (the tech)</option>}
          <option value="me">Me</option>
        </select>
      </label>
      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 text-[11px] font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm payment
      </button>
    </form>
  );
};
