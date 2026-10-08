import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { DispatchBooking } from '../../services/techDispatch';
import { DIAGNOSTIC_FEE_DOLLARS, TRAVEL_FEE_DOLLARS, WEATHER_FEE_DOLLARS } from '../../services/serviceCatalog';
import {
  closeOutProblem,
  computeCloseOut,
  formatCents,
  type LineDraft,
  type PartsBy,
  type TaxMode,
} from '../../services/closeOut';
import {
  closeOutPayload,
  openDeviceEmail,
  openDeviceSms,
  recordJobPayment,
  sendReceipt,
  uploadSignature,
  type ReceiptSendResult,
} from '../../services/jobPayments';
import {
  attachSquareSale,
  savePendingSale,
  squareChargeUrl,
  squarePlatform,
  type OpenSquareSale,
} from '../../services/squarePointOfSale';
import { SquareSalePicker } from './SquareSalePicker';
import { fetchZelleConfig, type ZelleConfig } from '../../services/zelle';
import { cashHandlingSteps } from '../../services/cashHandling';
import { QrCode } from './QrCode';
import { SignaturePad } from './SignaturePad';
import { capClass, cardClass } from './techUi';

type Mode = 'charge' | 'diagnostic_only';

const seg = (on: boolean) =>
  `min-h-[40px] flex-1 rounded-xl px-2 text-sm font-semibold ${
    on ? 'bg-brand/20 text-white ring-1 ring-brand' : 'bg-[#0b0c10] text-slate-300 ring-1 ring-white/10'
  }`;
const receiptInput =
  'w-full min-h-[44px] rounded-lg border border-zinc-300 bg-white px-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60';

export const TechPayScreen: React.FC<{
  job: DispatchBooking;
  onBack: () => void;
  onClosed: () => void;
  onDone: () => void;
}> = ({ job, onBack, onClosed, onDone }) => {
  const diagnosticFeeCents = job.holdAmountCents ?? DIAGNOSTIC_FEE_DOLLARS * 100;
  const shop = job.locationType === 'shop';

  const [mode, setMode] = useState<Mode>('charge');
  const [lines, setLines] = useState<LineDraft[]>([{ title: '', labor: '', parts: '' }]);
  const [member, setMember] = useState(false);
  const [weather, setWeather] = useState(false);
  const [firstResponder, setFirstResponder] = useState(false);
  const [taxMode, setTaxMode] = useState<TaxMode>('parts');
  const [partsBy, setPartsBy] = useState<PartsBy>('tech');
  const [notes, setNotes] = useState('');
  const [signerName, setSignerName] = useState(job.customer || '');
  const [signed, setSigned] = useState(false);
  const [slide, setSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'card' | 'zelle' | 'cash'>('card');
  const [zelle, setZelle] = useState<ZelleConfig | null>(null);
  const [closedTotal, setClosedTotal] = useState<{ total: number; payout: number } | null>(null);
  /** Card already charged in the Square app: 'find' lists the sales to pick
   *  from; 'manual' falls back to sliding without a Square record. */
  const [chargedInSquare, setChargedInSquare] = useState<'no' | 'find' | 'manual'>('no');
  const exportRef = useRef<(() => Promise<Blob | null>) | null>(null);

  const closeOut = useMemo(
    () =>
      computeCloseOut({
        kind: mode,
        lines,
        // Always charged: the diagnostic is not credited toward a repair.
        diagnosticCents: diagnosticFeeCents,
        travelCents: shop || member ? 0 : TRAVEL_FEE_DOLLARS * 100,
        // Mobile visits only, and members never pay it.
        weatherCents: weather && !shop && !member ? WEATHER_FEE_DOLLARS * 100 : 0,
        taxMode,
        partsBy,
        // One discount per visit: never on top of a membership.
        firstResponder: firstResponder && !member,
      }),
    [mode, lines, diagnosticFeeCents, shop, member, weather, firstResponder, taxMode, partsBy]
  );
  const problem = closeOutProblem(closeOut, signed && signerName.trim().length > 1);

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((cur) => cur.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  /** Card: save the signed receipt, then hand the amount to the Square Point
   *  of Sale app. The job closes when Square sends the phone back. */
  const chargeInSquare = async () => {
    if (saving) return;
    if (problem) {
      setError(problem);
      return;
    }
    const platform = squarePlatform();
    if (!platform) {
      setError('Card payments open the Square Point of Sale app — use this page on the phone that has it installed.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const png = await exportRef.current?.();
      if (!png) throw new Error('Could not read the signature — have the customer sign again.');
      const signaturePath = await uploadSignature(job.id, png);
      savePendingSale({
        bookingId: job.id,
        referenceCode: job.referenceCode,
        totalCents: closeOut.totalCents,
        payment: closeOutPayload(closeOut, {
          taxMode,
          partsBy,
          signaturePath,
          signerName: signerName.trim(),
          techNotes: notes.trim() || undefined,
        }),
        startedAt: Date.now(),
      });
      window.location.href = squareChargeUrl({
        platform,
        amountCents: closeOut.totalCents,
        bookingId: job.id,
        referenceCode: job.referenceCode,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the card payment');
    } finally {
      setSaving(false);
    }
  };

  /** A sale rung up in the Square app: close the job with it, checked by Square. */
  const closeWithSquareSale = async (sale: OpenSquareSale) => {
    if (saving) return;
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const png = await exportRef.current?.();
      if (!png) throw new Error('Could not read the signature — have the customer sign again.');
      const signaturePath = await uploadSignature(job.id, png);
      const saved = await attachSquareSale({
        bookingId: job.id,
        squarePaymentId: sale.id,
        payment: closeOutPayload(closeOut, {
          taxMode,
          partsBy,
          signaturePath,
          signerName: signerName.trim(),
          techNotes: notes.trim() || undefined,
        }),
      });
      setClosedTotal({ total: saved.totalCents, payout: saved.techPayoutCents });
      onClosed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not close the job with that sale');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void fetchZelleConfig()
      .then(setZelle)
      .catch(() => setZelle({ qrPayload: null, recipient: null, displayName: null }));
  }, []);

  /** Zelle or cash (or anything else the tech confirms): record how it was paid. */
  const confirmPaid = async () => {
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    try {
      const png = await exportRef.current?.();
      if (!png) throw new Error('Could not read the signature — have the customer sign again.');
      const signaturePath = await uploadSignature(job.id, png);
      const saved = await recordJobPayment(job.id, closeOut, {
        taxMode,
        partsBy,
        signaturePath,
        signerName: signerName.trim(),
        techNotes: notes.trim() || undefined,
        paymentMethod: payMethod === 'card' ? undefined : payMethod,
      });
      setClosedTotal({ total: saved.totalCents, payout: saved.techPayoutCents });
      onClosed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not close the job');
      setSlide(0);
    } finally {
      setSaving(false);
    }
  };

  if (closedTotal) {
    return (
      <div className="space-y-5 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Check className="h-7 w-7 text-emerald-300" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">Job closed · {formatCents(closedTotal.total)}</h2>
          <p className="mt-1 text-[15px] text-emerald-200">Your payout: {formatCents(closedTotal.payout)}</p>
        </div>
        <ReceiptSender job={job} onDone={onDone} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-1 border-b border-white/[0.06] bg-[#0b0c10]/95 px-2 py-1.5 backdrop-blur">
        <button type="button" onClick={onBack} aria-label="Back to job" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/5">
          <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div>
          <h2 className="font-heading text-base font-bold">Get paid · show the customer</h2>
          <p className="text-xs text-slate-400">Hand them the phone to check the total and sign</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        <div className="flex gap-2" role="group" aria-label="What was done">
          <button type="button" aria-pressed={mode === 'charge'} onClick={() => setMode('charge')} className={seg(mode === 'charge')}>
            Repair done
          </button>
          <button type="button" aria-pressed={mode === 'diagnostic_only'} onClick={() => setMode('diagnostic_only')} className={seg(mode === 'diagnostic_only')}>
            Diagnostic only
          </button>
        </div>

        {/* The receipt the customer reads and signs. */}
        <div className="rounded-[18px] bg-[#fafaf9] p-4 text-zinc-900 sm:p-5">
          <div className="flex items-start justify-between gap-3 pb-2">
            <div>
              <p className="font-heading text-base font-bold">Adaptivity Performance</p>
              <p className="text-[13px] text-zinc-600">
                {job.customer} · {job.vehicle}
              </p>
            </div>
            <p className="shrink-0 whitespace-nowrap text-right text-xs text-zinc-600">{job.referenceCode}</p>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-300 py-3">
            <p className="text-[15px] font-semibold">Diagnostic</p>
            <span className="font-heading font-semibold">
              {formatCents(diagnosticFeeCents)}
            </span>
          </div>

          {mode === 'charge' &&
            lines.map((l, i) => (
              <div key={i} className="space-y-2 border-b border-dashed border-zinc-300 py-3">
                <div className="flex items-center gap-2">
                  <label htmlFor={`line-title-${i}`} className="sr-only">
                    Repair line {i + 1}
                  </label>
                  <input
                    id={`line-title-${i}`}
                    value={l.title}
                    onChange={(e) => setLine(i, { title: e.target.value })}
                    placeholder="What you did, e.g. Front pads & rotors"
                    className={receiptInput}
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))}
                      aria-label={`Remove line ${i + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-zinc-600">
                    Labor $
                    <input inputMode="decimal" value={l.labor} onChange={(e) => setLine(i, { labor: e.target.value })} placeholder="0.00" className={`${receiptInput} mt-1 font-heading`} />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Parts $
                    <input inputMode="decimal" value={l.parts} onChange={(e) => setLine(i, { parts: e.target.value })} placeholder="0.00" className={`${receiptInput} mt-1 font-heading`} />
                  </label>
                </div>
              </div>
            ))}
          {mode === 'charge' && lines.length < 20 && (
            <button
              type="button"
              onClick={() => setLines((cur) => [...cur, { title: '', labor: '', parts: '' }])}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-400 text-sm font-semibold text-orange-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add line
            </button>
          )}

          {closeOut.discountCents > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-300 py-3">
              <p className="text-[15px] font-semibold">First responder discount (5% off labor)</p>
              <span className="shrink-0 whitespace-nowrap font-heading font-semibold text-emerald-700">−{formatCents(closeOut.discountCents)}</span>
            </div>
          )}
          {!shop && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-300 py-3">
              <p className="text-[15px] font-semibold">Travel</p>
              <span className={`font-heading font-semibold ${member ? 'text-zinc-400 line-through' : ''}`}>
                {formatCents(TRAVEL_FEE_DOLLARS * 100)}
              </span>
            </div>
          )}
          {closeOut.weatherCents > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-300 py-3">
              <p className="text-[15px] font-semibold">Severe weather fee</p>
              <span className="font-heading font-semibold">{formatCents(closeOut.weatherCents)}</span>
            </div>
          )}
          {closeOut.taxCents > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-300 py-3">
              <p className="text-[15px] font-semibold">Sales tax 8.25%{taxMode === 'parts' ? ' on parts' : ''}</p>
              <span className="font-heading font-semibold">{formatCents(closeOut.taxCents)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-4">
            <span className="text-base font-bold">Total</span>
            <span className="font-heading text-[32px] font-bold leading-none">{formatCents(closeOut.totalCents)}</span>
          </div>

          <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4">
            <SignaturePad onChange={setSigned} exportRef={exportRef} disabled={saving} />
            <label className="block text-xs text-zinc-600">
              Name of person signing
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} autoComplete="off" className={`${receiptInput} mt-1`} />
            </label>
            <p className="text-xs leading-relaxed text-zinc-600">
              I approve the work above and the total of {formatCents(closeOut.totalCents)}, paid in person.
            </p>
          </div>
        </div>

        <p className={capClass}>Settings for this job</p>
        {!shop && (
          <label className={`${cardClass} flex min-h-[52px] items-center justify-between gap-3 px-4`}>
            <span className="text-[15px]">Member — waive travel &amp; weather fees</span>
            <input type="checkbox" checked={member} onChange={(e) => setMember(e.target.checked)} className="h-6 w-6 accent-brand" />
          </label>
        )}
        {!shop && !member && (
          <label className={`${cardClass} flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5`}>
            <span>
              <span className="block text-[15px]">Rain / severe weather · +{formatCents(WEATHER_FEE_DOLLARS * 100)}</span>
              <span className="block text-xs text-slate-400">Tell the customer before you start</span>
            </span>
            <input type="checkbox" checked={weather} onChange={(e) => setWeather(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
          </label>
        )}
        {mode === 'charge' && !member && (
          <label className={`${cardClass} flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5`}>
            <span>
              <span className="block text-[15px]">First responder / veteran · −5% labor</span>
              <span className="block text-xs text-slate-400">Veterans, police, firefighters, EMTs, paramedics · check ID</span>
            </span>
            <input type="checkbox" checked={firstResponder} onChange={(e) => setFirstResponder(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
          </label>
        )}
        {mode === 'charge' && (
          <>
            <div className={`${cardClass} flex items-center justify-between gap-3 px-4 py-2`}>
              <span className="text-[15px]">Parts bought by</span>
              <div className="flex w-44 gap-1.5">
                <button type="button" aria-pressed={partsBy === 'tech'} onClick={() => setPartsBy('tech')} className={seg(partsBy === 'tech')}>
                  Me
                </button>
                <button type="button" aria-pressed={partsBy === 'company'} onClick={() => setPartsBy('company')} className={seg(partsBy === 'company')}>
                  Company
                </button>
              </div>
            </div>
            <div className={`${cardClass} flex items-center justify-between gap-3 px-4 py-2`}>
              <span className="text-[15px]">Tax on</span>
              <div className="flex w-52 gap-1.5">
                {(['parts', 'total', 'none'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={taxMode === m} onClick={() => setTaxMode(m)} className={seg(taxMode === m)}>
                    {m === 'parts' ? 'Parts' : m === 'total' ? 'Total' : 'None'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <label className={`${cardClass} block p-4`}>
          <span className={capClass}>Notes on the receipt (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Rear pads at 4 mm — replace within 6 months"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </label>
        <div className={`${cardClass} flex items-center justify-between gap-3 border-emerald-500/30 px-4 py-3`}>
          <span className="text-[15px] text-emerald-200">Your payout</span>
          <span className="font-heading text-lg font-bold text-emerald-200">{formatCents(closeOut.techPayoutCents)}</span>
        </div>
        {payMethod === 'cash' && (
          <div className={`${cardClass} space-y-3 border-amber-500/30 p-4`}>
            <p className="text-center font-heading text-3xl font-bold">{formatCents(closeOut.totalCents)}</p>
            <p className="text-sm font-bold text-amber-200">What to do with the cash</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
              {cashHandlingSteps({
                amount: formatCents(closeOut.totalCents),
                referenceCode: job.referenceCode,
                zelleName: zelle?.displayName,
                zelleRecipient: zelle?.recipient,
              }).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="text-xs text-slate-400">Slide below once you have the cash in hand.</p>
          </div>
        )}
        {payMethod === 'zelle' && (
          <div className={`${cardClass} space-y-3 p-4`}>
            <p className="text-center font-heading text-3xl font-bold">{formatCents(closeOut.totalCents)}</p>
            {zelle?.qrPayload ? (
              <div className="mx-auto w-fit rounded-xl bg-white p-2">
                <QrCode value={zelle.qrPayload} size={220} label="Zelle QR code" />
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400">
                {zelle ? 'The company Zelle QR code isn’t set up yet — ask an admin.' : 'Loading Zelle details…'}
              </p>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>
                Customer opens their bank app → Zelle → scans this code
                {zelle?.recipient ? ` (or sends to ${zelle.recipient})` : ''}.
              </li>
              <li>
                They send exactly {formatCents(closeOut.totalCents)} to {zelle?.displayName || 'Adaptivity Performance'} with memo{' '}
                <span className="font-semibold text-white">{job.referenceCode}</span>.
              </li>
              <li>Check the confirmation on their screen, then slide below.</li>
            </ol>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 space-y-1.5 border-t border-white/[0.06] bg-[#0b0c10] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex gap-1.5" role="group" aria-label="How is the customer paying?">
          {(['card', 'zelle', 'cash'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={payMethod === m}
              disabled={saving}
              onClick={() => {
                setPayMethod(m);
                setSlide(0);
              }}
              className={seg(payMethod === m)}
            >
              {m === 'card' ? 'Card' : m === 'zelle' ? 'Zelle' : 'Cash'}
            </button>
          ))}
        </div>
        {payMethod === 'card' && (
          <>
            <button
              type="button"
              onClick={() => void chargeInSquare()}
              disabled={saving}
              className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-brand px-4 font-heading text-base font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? 'Opening Square…' : `Charge card in Square · ${formatCents(closeOut.totalCents)}`}
            </button>
            {chargedInSquare === 'no' ? (
              <button
                type="button"
                onClick={() => setChargedInSquare('find')}
                disabled={saving}
                className="w-full text-center text-[12px] font-semibold text-slate-400 underline-offset-2 hover:underline"
              >
                Already charged in the Square app? Find the sale
              </button>
            ) : chargedInSquare === 'find' ? (
              <>
                {problem ? (
                  <p className="text-center text-xs text-slate-400">{problem}</p>
                ) : (
                  <SquareSalePicker bookingId={job.id} totalCents={closeOut.totalCents} busy={saving} onPick={(s) => void closeWithSquareSale(s)} />
                )}
                <button
                  type="button"
                  onClick={() => setChargedInSquare('manual')}
                  disabled={saving}
                  className="w-full text-center text-[11px] text-slate-500 underline-offset-2 hover:underline"
                >
                  Can’t find it? Close without the Square record
                </button>
              </>
            ) : null}
          </>
        )}
        {(payMethod !== 'card' || chargedInSquare === 'manual') && (
        <>
        <div className="relative">
          <div className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-full border ${problem ? 'border-white/10 bg-[#12141c]' : 'border-brand/45 bg-[#12141c]'}`}>
            <span className="pl-12 font-heading text-base font-bold">
              {saving
                ? 'Saving…'
                : `${payMethod === 'zelle' ? 'Slide when Zelle received' : payMethod === 'cash' ? 'Slide when cash received' : 'Slide when paid'} · ${formatCents(closeOut.totalCents)}`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={slide}
            disabled={Boolean(problem) || saving}
            aria-label={`Slide to confirm the customer paid ${formatCents(closeOut.totalCents)}`}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSlide(v);
              if (v >= 100) void confirmPaid();
            }}
            onPointerUp={() => slide < 100 && setSlide(0)}
            onBlur={() => slide < 100 && setSlide(0)}
            className="slide-confirm relative"
          />
        </div>
        <p className="text-center text-xs text-slate-400">{problem ?? 'Unlocked — slide all the way to close the job'}</p>
        </>
        )}
      </div>
    </div>
  );
};

/** Text and/or email the customer their receipt. Uses the business number and
 *  email when those are set up, otherwise opens the tech's own Messages or
 *  Mail with the same receipt filled in. */
export const ReceiptSender: React.FC<{ job: DispatchBooking; onDone: () => void }> = ({ job, onDone }) => {
  const [byText, setByText] = useState(Boolean(job.phone));
  const [byEmail, setByEmail] = useState(Boolean(job.customerEmail));
  const [phone, setPhone] = useState(job.phone || '');
  const [email, setEmail] = useState(job.customerEmail || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReceiptSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const channels: ('sms' | 'email')[] = [...(byText ? (['sms'] as const) : []), ...(byEmail ? (['email'] as const) : [])];
    if (!channels.length) return;
    setSending(true);
    setError(null);
    try {
      const r = await sendReceipt(job.id, channels, { phone, email });
      setResult(r);
      if (r.sms?.status === 'skipped') openDeviceSms(phone, r.smsBody);
      else if (r.email?.status === 'skipped') openDeviceEmail(email, r.subject, r.emailText);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the receipt');
    } finally {
      setSending(false);
    }
  };

  const line = (label: string, r?: ReceiptSendResult['sms']) =>
    r && (
      <p className="text-sm">
        {label}:{' '}
        {r.status === 'sent'
          ? <span className="text-emerald-300">sent to {r.to}</span>
          : r.status === 'skipped'
            ? <span className="text-amber-200">business {label.toLowerCase()} isn’t set up — sending from your phone</span>
            : <span className="text-red-300">{r.detail || 'failed'}</span>}
      </p>
    );

  return (
    <div className={`${cardClass} space-y-4 p-4`}>
      <p className="font-heading text-lg font-bold">Send the receipt</p>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={byText} onChange={(e) => setByText(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
        <MessageSquare className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Text to</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Customer’s mobile"
          aria-label="Text the receipt to"
          className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[15px] text-white placeholder:text-slate-500"
        />
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
        <Mail className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (e.target.value.trim()) setByEmail(true);
          }}
          placeholder="Customer’s email"
          aria-label="Email the receipt to"
          className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[15px] text-white placeholder:text-slate-500"
        />
      </label>
      {result && (
        <div className="space-y-1 rounded-xl bg-[#0b0c10] px-3.5 py-3">
          {line('Text', result.sms)}
          {line('Email', result.email)}
          {result.sms?.status === 'skipped' && result.email?.status === 'skipped' && (
            <button type="button" onClick={() => openDeviceEmail(email, result.subject, result.emailText)} className="min-h-[40px] text-sm font-semibold text-brand-soft">
              Now open the email on your phone
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || (!byText && !byEmail)}
          className="min-h-[52px] flex-1 rounded-2xl bg-brand font-heading text-base font-bold text-[#0b0c10] disabled:opacity-50"
        >
          {sending ? 'Sending…' : result ? 'Send again' : 'Send receipt'}
        </button>
        <button type="button" onClick={onDone} className="min-h-[52px] rounded-2xl border border-white/[0.14] px-5 text-[15px] font-semibold">
          {result ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  );
};
