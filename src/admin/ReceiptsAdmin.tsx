import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageSquare, Plus, Printer, Search, Send, Trash2, X } from 'lucide-react';
import { lineLaborCents, listQuotes, totalsFor, type Quote, type QuoteLine } from '../services/quotes';
import {
  createReceiptFromQuote,
  createWalkInReceipt,
  deleteStandaloneReceipt,
  listReceipts,
  receiptNumbersByQuote,
  standaloneInvoiceDoc,
  type ReceiptRow,
} from '../services/receipts';
import { RECEIPT_METHODS, receiptReferenceError, texasToday, type ReceiptMethod } from '../services/receiptPayment';
import { loadInvoice } from '../services/invoiceData';
import { openInvoicePrintWindow } from '../services/receiptPdf';
import { openDeviceEmail, openDeviceSms, sendReceipt } from '../services/jobPayments';
import { buildReceiptEmailText, buildReceiptSms, receiptSubject } from '../services/receiptMessage';
import { LABOR_RATE_CENTS, fetchDefaultLaborRateCents } from '../services/laborRate';
import { laborRateCentsForVehicle, laborRateKindForVehicle } from '../services/vehicleLaborRate';
import { SALES_TAX_LABEL, TAX_MODE_LABELS, type TaxMode } from '../services/salesTax';
import { lookupVin } from '../services/vinLookup';
import { isVinShaped, normalizeVin, vehicleLine } from '../services/vinDecode';

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });
}

type Filter = 'all' | 'job' | 'manual';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'job', label: 'Jobs' },
  { id: 'manual', label: 'Walk-ins & quotes' },
];

/** A receipt for someone who never booked, or for a quote they paid. */
type BuildMode = 'walkin' | 'quote';

const emptyLine = (): QuoteLine => ({ title: '', laborDollars: 0, partsDollars: 0 });

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
  const [mode, setMode] = useState<BuildMode>('walkin');
  const [quoteId, setQuoteId] = useState('');
  /* Walk-in: typed in from scratch, priced like a quote. */
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wVin, setWVin] = useState('');
  const [wVehicle, setWVehicle] = useState('');
  const [vinState, setVinState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [taxMode, setTaxMode] = useState<TaxMode>('parts');
  /* 10% of parts for getting them, whoever bought them. */
  const [partsPickup, setPartsPickup] = useState(true);
  const [rateCents, setRateCents] = useState(LABOR_RATE_CENTS);
  const [method, setMethod] = useState<ReceiptMethod>('cash');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(texasToday());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, q, done, rate] = await Promise.all([
        listReceipts(),
        listQuotes(200),
        receiptNumbersByQuote(),
        fetchDefaultLaborRateCents(),
      ]);
      setRows(r);
      setRateCents(rate);
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
    setMode('quote');
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
  const walkLines = lines.filter((l) => l.title.trim());
  /* European vehicles are billed at their own hourly rate. */
  const walkRateCents = laborRateCentsForVehicle(wVehicle, rateCents);
  const walkRateKind = laborRateKindForVehicle(wVehicle);
  const walkTotals = useMemo(
    () => totalsFor(lines.filter((l) => l.title.trim()), taxMode, walkRateCents, partsPickup),
    [lines, taxMode, walkRateCents, partsPickup]
  );
  const wVinNorm = normalizeVin(wVin);
  const wVinOk = !wVinNorm || isVinShaped(wVinNorm);
  const updateLine = (i: number, patch: Partial<QuoteLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  /* A whole VIN decodes (NHTSA) and fills in the vehicle. */
  const onVinChange = (value: string) => {
    setWVin(value.toUpperCase());
    const v = normalizeVin(value);
    if (!isVinShaped(v)) {
      setVinState('idle');
      return;
    }
    setVinState('loading');
    void lookupVin(v)
      .then((summary) => {
        setWVehicle(vehicleLine(summary));
        setVinState('done');
      })
      .catch(() => setVinState('error'));
  };
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
    setMode('walkin');
    setQuoteId('');
    setWName('');
    setWPhone('');
    setWEmail('');
    setWAddress('');
    setWVin('');
    setWVehicle('');
    setVinState('idle');
    setLines([emptyLine()]);
    setTaxMode('parts');
    setPartsPickup(true);
    setMethod('cash');
    setReference('');
    setPaidOn(texasToday());
    setNotes('');
  };

  const canSave =
    !saving &&
    !referenceProblem &&
    (mode === 'quote' ? Boolean(quote) : Boolean(wName.trim()) && walkLines.length > 0 && walkTotals.totalCents > 0 && wVinOk);
  const saveTotal = mode === 'quote' ? quote?.totalCents ?? 0 : walkTotals.totalCents;

  const save = async () => {
    if (mode === 'quote' && !quote) {
      setError('Pick the quote that was paid.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payment = { method, reference, paidOn, notes };
      const r =
        mode === 'quote' && quote
          ? await createReceiptFromQuote(quote, payment)
          : await createWalkInReceipt(
              {
                customerName: wName,
                customerPhone: wPhone,
                customerEmail: wEmail,
                customerAddress: wAddress,
                vehicle: wVehicle,
                vin: wVin,
                lineItems: lines,
                taxMode,
                partsPickup,
                laborRateCents: walkRateCents,
              },
              payment
            );
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
      } else if (r.standalone) {
        openInvoicePrintWindow(standaloneInvoiceDoc(r.standalone));
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

  /** Walk-in and quote receipts: sent from this phone's own Messages or Mail. */
  const shareRow = (r: ReceiptRow, how: 'sms' | 'email') => {
    if (!r.standalone) return;
    const receipt = standaloneInvoiceDoc(r.standalone).receipt;
    const opened =
      how === 'sms'
        ? openDeviceSms(r.customerPhone ?? '', buildReceiptSms(receipt))
        : openDeviceEmail(r.customerEmail ?? '', receiptSubject(receipt), buildReceiptEmailText(receipt));
    if (!opened) setError(how === 'sms' ? 'That phone number does not look right.' : 'There is no email on this receipt.');
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
            Every paid job, plus receipts you make here — for a customer who never booked, or a quote they paid.
            Print or send any of them.
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
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1 bg-[#0b0c10]" role="tablist" aria-label="Receipt for">
            {(
              [
                ['walkin', 'No booking (walk-in)'],
                ['quote', 'From a quote'],
              ] as [BuildMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`py-2 rounded-lg text-xs font-bold ${mode === id ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'walkin' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="walkin-name" className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Customer name <span className="text-orange-400">*</span>
                  </label>
                  <input id="walkin-name" className={inputCls} value={wName} placeholder="Jane Whitaker" onChange={(e) => setWName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="walkin-phone" className="block text-[11px] font-semibold text-slate-300 mb-1">Phone</label>
                  <input id="walkin-phone" type="tel" className={inputCls} value={wPhone} placeholder="(940) 555-0142" onChange={(e) => setWPhone(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="walkin-email" className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                  <input id="walkin-email" type="email" className={inputCls} value={wEmail} placeholder="jane@example.com" onChange={(e) => setWEmail(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="walkin-address" className="block text-[11px] font-semibold text-slate-300 mb-1">Address</label>
                  <input id="walkin-address" className={inputCls} value={wAddress} placeholder="Optional" onChange={(e) => setWAddress(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="walkin-vin" className="block text-[11px] font-semibold text-slate-300 mb-1">VIN</label>
                  <div className="relative">
                    <input
                      id="walkin-vin"
                      className={`${inputCls} font-mono tracking-wider pr-9`}
                      value={wVin}
                      maxLength={20}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="Optional · fills in the vehicle"
                      onChange={(e) => onVinChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                      {vinState === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : vinState === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </span>
                  </div>
                  {!wVinOk && <p className="mt-1 text-[11px] text-amber-300">{wVinNorm.length}/17 — a VIN has no I, O or Q. Fix it or clear it.</p>}
                  {vinState === 'error' && <p className="mt-1 text-[11px] text-amber-300">Could not look up that VIN — type the vehicle in.</p>}
                </div>
                <div>
                  <label htmlFor="walkin-vehicle" className="block text-[11px] font-semibold text-slate-300 mb-1">Vehicle</label>
                  <input id="walkin-vehicle" className={inputCls} value={wVehicle} placeholder="2018 Honda Accord" onChange={(e) => setWVehicle(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Work done</p>
                  <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])} className="text-[11px] font-bold text-orange-400">
                    + Add line
                  </button>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        aria-label={`Line ${i + 1} description`}
                        placeholder="Battery replacement"
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
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Hours</label>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          inputMode="decimal"
                          aria-label={`Line ${i + 1} hours`}
                          className={inputCls}
                          value={line.hours || ''}
                          placeholder="1.5"
                          onChange={(e) => {
                            const hours = Number(e.target.value) || 0;
                            updateLine(i, hours > 0 ? { hours } : { hours: undefined });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Labor ${line.hours ? '' : ' (flat)'}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`Line ${i + 1} labor`}
                          className={inputCls}
                          disabled={Boolean(line.hours && line.hours > 0)}
                          value={line.hours && line.hours > 0 ? (lineLaborCents(line, walkRateCents) / 100).toFixed(2) : line.laborDollars || ''}
                          onChange={(e) => updateLine(i, { laborDollars: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Parts $</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`Line ${i + 1} parts`}
                          className={inputCls}
                          value={line.partsDollars || ''}
                          onChange={(e) => updateLine(i, { partsDollars: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-slate-500">
                  Hours are charged at {money(walkRateCents)}/hr
                  {walkRateKind === 'diesel' ? ', the diesel rate.' : walkRateKind === 'european' ? ', the European rate.' : ', the shop rate.'}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="walkin-tax" className="block text-[11px] font-semibold text-slate-300 mb-1">Sales tax</label>
                  <select id="walkin-tax" className={inputCls} value={taxMode} onChange={(e) => setTaxMode(e.target.value as TaxMode)}>
                    {(Object.keys(TAX_MODE_LABELS) as TaxMode[]).map((m) => (
                      <option key={m} value={m}>
                        {TAX_MODE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                  {walkTotals.partsCents > 0 && (
                    <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={partsPickup}
                        onChange={(e) => setPartsPickup(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-orange-500"
                      />
                      <span>
                        Parts pickup · 10% of parts
                        <span className="block text-[10px] text-slate-500">Off only if the customer brought the parts</span>
                      </span>
                    </label>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Labor</span>
                    <span className="tabular-nums">{money(walkTotals.laborCents)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Parts</span>
                    <span className="tabular-nums">{money(walkTotals.partsCents)}</span>
                  </div>
                  {walkTotals.partsPickupCents > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Parts pickup (10%)</span>
                      <span className="tabular-nums">{money(walkTotals.partsPickupCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({SALES_TAX_LABEL})</span>
                    <span className="tabular-nums">{money(walkTotals.taxCents)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                    <span>Total paid</span>
                    <span className="tabular-nums">{money(walkTotals.totalCents)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'quote' && (
            <div className="space-y-4">
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
            disabled={!canSave}
            onClick={() => void save()}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {saving ? 'Saving…' : saveTotal > 0 ? `Save & print receipt · ${money(saveTotal)}` : 'Save & print receipt'}
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
                              : r.reference
                                ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                                : 'bg-violet-500/15 text-violet-300 border-violet-400/30'
                          }`}
                        >
                          {r.source === 'job' ? `Job${r.reference ? ` ${r.reference}` : ''}` : r.reference ? `Quote ${r.reference}` : 'Walk-in'}
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
                      <>
                        {r.customerPhone && (
                          <button
                            type="button"
                            onClick={() => shareRow(r, 'sms')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-[11px] font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Text
                          </button>
                        )}
                        {r.customerEmail && (
                          <button
                            type="button"
                            onClick={() => shareRow(r, 'email')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-[11px] font-bold"
                          >
                            <Mail className="w-3.5 h-3.5" /> Email
                          </button>
                        )}
                      </>
                    )}
                    {r.source === 'manual' && (
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
