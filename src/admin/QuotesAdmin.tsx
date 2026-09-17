import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Trash2, X } from 'lucide-react';
import {
  createQuote,
  deleteQuote,
  listQuotes,
  setQuoteStatus,
  totalsFor,
  type Quote,
  type QuoteLine,
  type QuoteStatus,
} from '../services/quotes';
import { openQuotePrintWindow } from '../services/quotePdf';
import { SALES_TAX_LABEL, TAX_MODE_LABELS, type TaxMode } from '../services/salesTax';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'declined', 'expired'];

const STATUS_STYLE: Record<QuoteStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  sent: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  declined: 'bg-red-500/15 text-red-300 border-red-400/30',
  expired: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
};

const emptyLine = (): QuoteLine => ({ title: '', laborDollars: 0, partsDollars: 0, note: '' });

export const QuotesAdmin: React.FC = () => {
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [taxMode, setTaxMode] = useState<TaxMode>('parts');
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listQuotes());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Same arithmetic the service uses on save, so the figure on screen and the
     figure on the PDF cannot disagree. */
  const totals = useMemo(
    () => totalsFor(lines.filter((l) => l.title.trim()), taxMode),
    [lines, taxMode]
  );

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setVehicle('');
    setNotes('');
    setValidUntil('');
    setTaxMode('parts');
    setLines([emptyLine()]);
  };

  const updateLine = (i: number, patch: Partial<QuoteLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async (andPrint: boolean) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const quote = await createQuote({
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        vehicle,
        lineItems: lines,
        taxMode,
        notes,
        validUntil: validUntil || null,
        status: andPrint ? 'sent' : 'draft',
      });
      setMessage(`${quote.quoteNumber} saved — ${money(quote.totalCents)}`);
      resetForm();
      setBuilding(false);
      await load();
      if (andPrint) openQuotePrintWindow(quote);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save quote');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (q: Quote, status: QuoteStatus) => {
    try {
      await setQuoteStatus(q.id, status);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update status');
    }
  };

  const remove = async (q: Quote) => {
    if (!window.confirm(`Delete ${q.quoteNumber} for ${q.customerName}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteQuote(q.id);
      setMessage(`${q.quoteNumber} deleted.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete quote');
    }
  };

  const inputCls =
    'w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Quotes</h2>
          <p className="text-xs text-slate-400">
            Price a job for anyone who asks — no booking needed. Saves a numbered estimate and
            prints a PDF you can text or email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuilding((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold"
        >
          {building ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {building ? 'Close builder' : 'New quote'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-xs text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-3 py-2">
          {message}
        </p>
      )}

      {building && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Customer name <span className="text-orange-400">*</span>
              </label>
              <input className={inputCls} value={customerName} placeholder="Jane Whitaker"
                onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Vehicle</label>
              <input className={inputCls} value={vehicle} placeholder="2019 Ford F-150 5.0"
                onChange={(e) => setVehicle(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone</label>
              <input className={inputCls} value={customerPhone} placeholder="(940) 555-0142"
                onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
              <input className={inputCls} value={customerEmail} placeholder="jane@example.com"
                onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Service address
              </label>
              <input className={inputCls} value={customerAddress} placeholder="123 Oak St, Northlake, TX 76226"
                onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Line items
              </p>
              <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])}
                className="text-[11px] font-bold text-orange-400">
                + Add line
              </button>
            </div>

            {lines.map((line, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Front brake pads & rotors"
                    value={line.title}
                    onChange={(e) => updateLine(i, { title: e.target.value })}
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                      className="shrink-0 w-10 rounded-xl border border-white/15 text-slate-400 hover:text-red-300 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Labor $</label>
                    <input type="number" min="0" step="0.01" className={inputCls}
                      value={line.laborDollars || ''}
                      onChange={(e) => updateLine(i, { laborDollars: Number(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Parts $</label>
                    <input type="number" min="0" step="0.01" className={inputCls}
                      value={line.partsDollars || ''}
                      onChange={(e) => updateLine(i, { partsDollars: Number(e.target.value) || 0 })} />
                  </div>
                </div>
                <input className={inputCls} placeholder="Optional note shown under this line"
                  value={line.note || ''}
                  onChange={(e) => updateLine(i, { note: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sales tax</label>
              <select className={inputCls} value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as TaxMode)}>
                {(Object.keys(TAX_MODE_LABELS) as TaxMode[]).map((m) => (
                  <option key={m} value={m}>{TAX_MODE_LABELS[m]}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Texas repair labor is not taxed when stated separately — parts only is the norm.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Valid until</label>
              <input type="date" className={inputCls} value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Labor</span><span className="tabular-nums">{money(totals.laborCents)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Parts</span><span className="tabular-nums">{money(totals.partsCents)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax ({SALES_TAX_LABEL})</span>
                <span className="tabular-nums">{money(totals.taxCents)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                <span>Total</span><span className="tabular-nums">{money(totals.totalCents)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Notes</label>
            <textarea rows={2} className={inputCls} value={notes}
              placeholder="Anything the customer should know — lead time on parts, what is not included…"
              onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button type="button" disabled={busy} onClick={() => void save(true)}
              className="flex-1 min-w-[180px] py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-60">
              {busy ? 'Saving…' : 'Save & print PDF'}
            </button>
            <button type="button" disabled={busy} onClick={() => void save(false)}
              className="py-3 px-5 rounded-xl border border-white/15 text-slate-200 text-xs font-bold disabled:opacity-60">
              Save as draft
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500 animate-pulse">Loading quotes…</p>
      ) : rows.length === 0 ? (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-300 font-semibold">No quotes yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Next time someone calls for a price, build it here and send them the PDF.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((q) => (
            <li key={q.id} className="bg-[#12141c] border border-white/10 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{q.quoteNumber}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLE[q.status]}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {q.customerName}
                    {q.vehicle ? ` · ${q.vehicle}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(q.createdAt).toLocaleDateString()} · {q.lineItems.length} line
                    {q.lineItems.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-white tabular-nums">{money(q.totalCents)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button type="button" onClick={() => openQuotePrintWindow(q)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-[11px] font-bold">
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
                <select
                  value={q.status}
                  onChange={(e) => void changeStatus(q, e.target.value as QuoteStatus)}
                  className="bg-[#0b0c10] border border-white/15 rounded-lg px-2 py-2 text-[11px] text-slate-200"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" onClick={() => void remove(q)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-slate-500 hover:text-red-300 text-[11px] font-bold ml-auto">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
