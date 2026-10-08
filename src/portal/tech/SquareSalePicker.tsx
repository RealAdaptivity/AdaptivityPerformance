import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatCents } from '../../services/closeOut';
import { fetchOpenSquareSales, type OpenSquareSale } from '../../services/squarePointOfSale';
import { paymentMethodText } from '../../services/receiptMessage';

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * For a card the tech charged in the Square app directly: today's Square
 * sales that are not on a job yet. Only a sale for exactly the receipt total
 * can be picked; the server checks it again with Square before closing.
 */
export const SquareSalePicker: React.FC<{
  bookingId: string;
  totalCents: number;
  busy: boolean;
  onPick: (sale: OpenSquareSale) => void;
}> = ({ bookingId, totalCents, busy, onPick }) => {
  const [sales, setSales] = useState<OpenSquareSale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSales(await fetchOpenSquareSales(bookingId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Square sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Load once when opened; the refresh button reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const matching = (sales ?? []).filter((s) => s.amountCents === totalCents);
  const others = (sales ?? []).filter((s) => s.amountCents !== totalCents);

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-[#12141c] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Pick the Square sale · {formatCents(totalCents)}</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          aria-label="Refresh Square sales"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      {sales && sales.length === 0 && (
        <p className="text-xs text-slate-400">
          No card sales in Square in the last 12 hours that aren’t on a job. If you just charged it, wait a few seconds
          and refresh.
        </p>
      )}
      <ul className="max-h-[38vh] space-y-1.5 overflow-y-auto">
        {matching.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(s)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-brand/50 bg-brand/10 px-3 text-left hover:bg-brand/20 disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-bold">{formatCents(s.amountCents)} · {paymentMethodText({ method: 'card', cardBrand: s.cardBrand, cardLast4: s.cardLast4 })}</span>
                <span className="block text-[11px] text-slate-400">{timeLabel(s.createdAt)}{s.note ? ` · ${s.note}` : ''}</span>
              </span>
              <span className="text-xs font-bold text-brand-soft">Use this</span>
            </button>
          </li>
        ))}
        {others.map((s) => (
          <li
            key={s.id}
            className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/5 px-3 text-slate-500"
          >
            <span className="text-[13px]">
              {formatCents(s.amountCents)} · {paymentMethodText({ method: 'card', cardBrand: s.cardBrand, cardLast4: s.cardLast4 })} · {timeLabel(s.createdAt)}
            </span>
            <span className="text-[11px]">Different total</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
