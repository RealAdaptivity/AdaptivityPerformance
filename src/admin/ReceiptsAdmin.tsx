import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Printer, Search, Send, Trash2, X } from 'lucide-react';
import { listQuotes, type Quote } from '../services/quotes';
import {
  createReceiptFromQuote,
  deleteStandaloneReceipt,
  fetchStandaloneReceipt,
  listReceipts,
  receiptNumbersByQuote,
  standaloneInvoiceDoc,
  type ReceiptRow,
} from '../services/receipts';
import { RECEIPT_METHODS, receiptReferenceError, texasToday, type ReceiptMethod } from '../services/receiptPayment';
import { loadInvoice } from '../services/invoiceData';
import { openInvoicePrintWindow } from '../services/receiptPdf';
import { sendReceipt } from '../services/jobPayments';

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });
}

type Filter = 'all' | 'job' | 'quote';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'job', label: 'Jobs' },
  { id: 'quote', label: 'From quotes' },
];

export const ReceiptsAdmin: React.FC<{
  /** Open the builder on this quote (the Receipt button in the Quotes tab). */
  startFromQuoteId?: string | null;
  onStarted?: () => void;
}> = ({ startFromQuoteId, onStarted }) => {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipted, setReceipted] = useState<Map<string, { id: string; receiptNumber: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [building, setBuilding] = useState(false);
  const [quoteId, setQuoteId] = useState('');
  const [method, setMethod] = useState<ReceiptMethod>('cash');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(texasToday());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, q, done] = await Promise.all([listReceipts(), listQuotes(200), receiptNumbersByQuote()]);
      setRows(r);
      setQuotes(q);
      setReceipted(done);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!startFromQuoteId) return;
    setBuilding(true);
    setQuoteId(startFromQuoteId);
    onStarted?.();
  }, [startFromQuoteId, onStarted]);

  /* Quotes not paid yet: accepted first, then sent, then the rest. */
  const openQuotes = useMemo(() => {
    const rank: Record<string, number> = { accepted: 0, sent: 1, draft: 2 };
    return quotes
      .filter((q) => !receipted.has(q.id) && q.totalCents > 0 && q.status !== 'declined')
      .sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3) || b.createdAt.localeCompare(a.createdAt));
  }, [quotes, receipted]);
  const quote = quotes.find((q) => q.id === quoteId) ?? null;
  const methodInfo = RECEIPT_METHODS.find((m) => m.id === method)!;
  const referenceProblem = reference.trim() || method === 'zelle' || method === 'other' ? receiptReferenceError(method, reference) : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return rows.filter((r) => {
      if (filter !== 'all' && r.source !== filter) return false;
      if (!q) return true;
      return (
        [r.receiptNumber, r.reference, r.customerName, r.vehicle, r.customerEmail, r.paidVia]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)) ||
        (digits.length >= 4 && (r.customerPhone ?? '').replace(/\D/g, '').includes(digits))
      );
    });
  }, [rows, filter, query]);
  const visibleTotal = visible.reduce((sum, r) => sum + r.totalCents - r.refundedCents, 0);

  const resetBuilder = () => {
    setQuoteId('');
    setMethod('cash');
    setReference('');
    setPaidOn(texasToday());
    setNotes('');
  };

  const save = async () => {
    if (!quote) {
      setError('Pick the quote that was paid.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const r = await createReceiptFromQuote(quote, { method, reference, paidOn, notes });
      setMessage(`${r.receiptNumber} saved for ${r.customerName} — ${money(r.totalCents)}.`);
      resetBuilder();
      setBuilding(false);
      openInvoicePrintWindow(standaloneInvoiceDoc(r));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the receipt');
    } finally {
      setSaving(false);
    }
  };

  const printRow = async (r: ReceiptRow) => {
    setBusyId(`print:${r.id}`);
    setError(null);
    try {
      if (r.source === 'job') {
        const doc = await loadInvoice(r.id);
        if (!doc) throw new Error('This job has no close-out to print.');
        openInvoicePrintWindow(doc);
      } else {
        const s = await fetchStandaloneReceipt(r.id);
        if (!s) throw new Error('That receipt was deleted.');
        openInvoicePrintWindow(standaloneInvoiceDoc(s));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the receipt');
    } finally {
      setBusyId(null);
    }
  };

  /** Text and email a job's receipt again, from the business number and address. */
  const sendRow = async (r: ReceiptRow) => {
    setBusyId(`send:${r.id}`);
    setError(null);
    setMessage(null);
    try {
      const res = await sendReceipt(r.id, ['sms', 'email'], {});
      const said = (label: string, c?: { status: string; detail?: string; to?: string }) =>
        c ? `${label} ${c.status === 'sent' ? `sent to ${c.to}` : c.status === 'skipped' ? 'not set up yet' : `failed${c.detail ? ` (${c.detail})` : ''}`}` : '';
      setMessage(`${r.receiptNumber}: ${[said('Text', res.sms), said('Email', res.email)].filter(Boolean).join(' · ')}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the receipt');
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (r: ReceiptRow) => {
    if (!window.confirm(`Delete receipt ${r.receiptNumber} for ${r.customerName}? This cannot be undone.`)) return;
    setBusyId(`delete:${r.id}`);
    setError(null);
    try {
      await deleteStandaloneReceipt(r.id);
      setMessage(`${r.receiptNumber} deleted.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the receipt');
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    'w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Receipts</h2>
          <p className="text-xs text-slate-400">
            Every paid job, and receipts for quotes paid by cash, card, Zelle or check. Print or resend any of them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBuilding((v) => !v);
            setError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          {building ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {building ? 'Close' : 'New receipt'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
      )}
      {message && (
        <p className="text-xs text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-3 py-2">{message}</p>
      )}

      {building && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-4">
          <div>
            <label htmlFor="receipt-quote" className="block text-[11px] font-semibold text-slate-300 mb-1">
              Quote that was paid <span className="text-orange-400">*</span>
            </label>
            <select id="receipt-quote" className={inputCls} value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
              <option value="">Pick a quote…</option>
              {quote && !openQuotes.includes(quote) && (
                <option value={quote.id}>
                  {quote.quoteNumber} · {quote.customerName} · {receipted.has(quote.id) ? 'already has a receipt' : quote.status}
                </option>
              )}
              {openQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNumber} · {q.customerName} · {money(q.totalCents)} · {q.status}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              The receipt shows the quote exactly as priced. Jobs closed in the tech app get their receipt automatically.
            </p>
          </div>

          {quote && receipted.has(quote.id) && (
            <p className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-xl px-3 py-2">
              {quote.quoteNumber} already has receipt {receipted.get(quote.id)!.receiptNumber}. Saving makes a second one.
            </p>
          )}

          {quote && (
            <div className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 text-[11px] space-y-1">
              <p className="text-sm font-bold text-white">{quote.customerName}</p>
              {quote.vehicle && <p className="text-slate-300">{quote.vehicle}</p>}
              {quote.vin && <p className="font-mono text-[10px] text-slate-500">VIN {quote.vin}</p>}
              <ul className="pt-1 space-y-0.5">
                {quote.lineItems
                  .filter((l) => l.title.trim())
                  .map((l, i) => (
                    <li key={i} className="text-slate-400">
                      {l.title}
                    </li>
                  ))}
              </ul>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-white/10">
                <span>Labor</span>
                <span className="tabular-nums">{money(quote.laborCents)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Parts</span>
                <span className="tabular-nums">{money(quote.partsCents)}</span>
              </div>
              {quote.partsPickupCents > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Parts pickup (10%)</span>
                  <span className="tabular-nums">{money(quote.partsPickupCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax</span>
                <span className="tabular-nums">{money(quote.taxCents)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                <span>Total paid</span>
                <span className="tabular-nums">{money(quote.totalCents)}</span>
              </div>
            </div>
          )}

          <div>
            <p className="block text-[11px] font-semibold text-slate-300 mb-1">How they paid</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How they paid">
              {RECEIPT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={method === m.id}
                  onClick={() => {
                    setMethod(m.id);
                    setReference('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                    method === m.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/15 text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {methodInfo.reference && (
              <div>
                <label htmlFor="receipt-ref" className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {methodInfo.reference}
                  {method === 'zelle' || method === 'other' ? <span className="text-orange-400"> *</span> : ' (optional)'}
                </label>
                <input
                  id="receipt-ref"
                  className={inputCls}
                  value={reference}
                  maxLength={80}
                  inputMode={method === 'card' ? 'numeric' : undefined}
                  placeholder={methodInfo.placeholder}
                  onChange={(e) => setReference(e.target.value)}
                />
                {referenceProblem && reference.trim() && <p className="mt-1 text-[11px] text-amber-300">{referenceProblem}</p>}
              </div>
            )}
            <div>
              <label htmlFor="receipt-date" className="block text-[11px] font-semibold text-slate-300 mb-1">
                Paid on
              </label>
              <input id="receipt-date" type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="receipt-notes" className="block text-[11px] font-semibold text-slate-300 mb-1">
              Notes on the receipt
            </label>
            <textarea
              id="receipt-notes"
              rows={2}
              className={inputCls}
              value={notes}
              placeholder="Optional — e.g. paid at the shop, mileage"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="button"
            disabled={saving || !quote || Boolean(referenceProblem)}
            onClick={() => void save()}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {saving ? 'Saving…' : quote ? `Save & print receipt · ${money(quote.totalCents)}` : 'Save & print receipt'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-white/10 p-0.5 bg-[#12141c]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${filter === f.id ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            className={`${inputCls} pl-8 py-2 text-xs`}
            value={query}
            aria-label="Search receipts"
            placeholder="Name, phone, R- or AP- number"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 animate-pulse">Loading receipts…</p>
      ) : visible.length === 0 ? (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-300 font-semibold">{rows.length ? 'No receipts match' : 'No receipts yet'}</p>
          <p className="text-xs text-slate-500 mt-1">
            Jobs show up here once the tech closes them. For a quote paid another way, tap New receipt.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            {visible.length} receipt{visible.length === 1 ? '' : 's'} · {money(visibleTotal)} collected
          </p>
          <ul className="space-y-2">
            {visible.map((r) => {
              const refunded = r.refundedCents > 0;
              return (
                <li key={`${r.source}:${r.id}`} className="bg-[#12141c] border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{r.receiptNumber}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                            r.source === 'job'
                              ? 'bg-orange-500/15 text-orange-300 border-orange-400/30'
                              : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                          }`}
                        >
                          {r.source === 'job' ? 'Job' : 'Quote'}
                          {r.reference ? ` ${r.reference}` : ''}
                        </span>
                        {refunded && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-400/30">
                            {r.refundedCents >= r.totalCents ? 'Refunded' : 'Part refunded'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 truncate">
                        {r.customerName}
                        {r.vehicle ? ` · ${r.vehicle}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {shortDate(r.paidAt)} · {r.paidVia}
                        {r.source === 'job' && (r.sentByText || r.sentByEmail)
                          ? ` · sent by ${[r.sentByText && 'text', r.sentByEmail && 'email'].filter(Boolean).join(' & ')}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold text-white tabular-nums">{money(r.totalCents)}</p>
                      {refunded && <p className="text-[11px] text-amber-300 tabular-nums">-{money(r.refundedCents)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void printRow(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-[11px] font-bold disabled:opacity-50"
                    >
                      {busyId === `print:${r.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      Receipt PDF
                    </button>
                    {r.source === 'job' ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void sendRow(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-[11px] font-bold disabled:opacity-50"
                      >
                        {busyId === `send:${r.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Text &amp; email
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void removeRow(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-slate-500 hover:text-red-300 text-[11px] font-bold ml-auto disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
