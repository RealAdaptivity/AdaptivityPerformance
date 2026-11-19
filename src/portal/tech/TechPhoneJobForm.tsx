import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { createBookingRequest } from '../../services/bookingRequestApi';
import { computeCloseOut, formatCents } from '../../services/closeOut';
import { parseWorkOrder, workOrderCloseOutInput, WORK_ORDER_MAX_LINES } from '../../services/workOrder';
import { DIAGNOSTIC_FEE_DOLLARS, TRAVEL_FEE_DOLLARS } from '../../services/serviceCatalog';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../../services/scheduleWindows';
import { lookupServiceZip } from '../../services/serviceArea';
import { lookupVin } from '../../services/vinLookup';
import { suggestedVehicleClass } from '../../services/vehicleLaborRate';
import { displayPhone } from '../../services/bookingFlow';
import {
  normalizePlate,
  normalizeVinInput,
  validatePhoneJob,
  type PhoneJobErrors,
  type PhoneJobFields,
} from '../../services/techPhoneJob';
import { capClass, cardClass } from './techUi';

type Line = { title: string; parts: string; labor: string };
const emptyLine = (): Line => ({ title: '', parts: '', labor: '' });

const input = (bad?: string) =>
  `w-full min-h-[48px] rounded-xl border bg-[#0b0c10] px-3.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 ${
    bad ? 'border-amber-400/70' : 'border-white/[0.12]'
  }`;
const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-400';
const Err: React.FC<{ msg?: string }> = ({ msg }) => (msg ? <p className="mt-1 text-[13px] text-amber-300">{msg}</p> : null);

/** A tech writes up a phone call as a booked job: the customer, the vehicle,
 *  and what it needs (parts with the upcharge in, labor, the pickup fee), so
 *  dispatch sees everything and the tech sees their payout before the visit. */
export const TechPhoneJobForm: React.FC<{ onBack: () => void; onBooked: () => void }> = ({ onBack, onBooked }) => {
  const [f, setF] = useState<PhoneJobFields>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    zip: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    plate: '',
    agreed: false,
  });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [partsPickup, setPartsPickup] = useState(true);
  const [date, setDate] = useState(todayISODate());
  const [timeWindow, setTimeWindow] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<PhoneJobErrors>({});
  const [vinState, setVinState] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ ref: string; already: boolean } | null>(null);

  const set = <K extends keyof PhoneJobFields>(k: K, v: PhoneJobFields[K]) => {
    setF((cur) => ({ ...cur, [k]: v }));
    setErrors((cur) => ({ ...cur, [k]: undefined }));
  };
  const setLine = (i: number, patch: Partial<Line>) => setLines((cur) => cur.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const order = useMemo(() => parseWorkOrder({ lines, partsPickup }), [lines, partsPickup]);
  const estimate = useMemo(
    () =>
      order
        ? computeCloseOut(
            workOrderCloseOutInput(order, { diagnosticCents: DIAGNOSTIC_FEE_DOLLARS * 100, travelCents: TRAVEL_FEE_DOLLARS * 100 })
          )
        : null,
    [order]
  );
  const zipInfo = /^\d{5}$/.test(f.zip.trim()) ? lookupServiceZip(f.zip) : null;
  const outsideArea = /^\d{5}$/.test(f.zip.trim()) && !zipInfo;

  const decodeVin = async () => {
    setVinState({ busy: true, msg: null });
    try {
      const s = await lookupVin(f.vin);
      setF((cur) => ({ ...cur, year: s.year || cur.year, make: s.make || cur.make, model: s.model || cur.model }));
      setErrors((cur) => ({ ...cur, vin: undefined, year: undefined, make: undefined, model: undefined }));
      setVinState({ busy: false, msg: s.description || 'Decoded' });
    } catch (e) {
      setVinState({ busy: false, msg: e instanceof Error ? e.message : 'Could not decode that VIN' });
    }
  };

  const submit = async () => {
    setSubmitError(null);
    const found = validatePhoneJob(f, new Date().getFullYear());
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setSubmitError('Fix the highlighted fields first.');
      return;
    }
    setSubmitting(true);
    try {
      const vehicle = `${f.year.trim()} ${f.make.trim()} ${f.model.trim()}`;
      const address = `${f.street.trim()}, ${f.city.trim()}, TX ${f.zip.trim()}`;
      const result = await createBookingRequest({
        customerName: `${f.firstName.trim()} ${f.lastName.trim()}`,
        customerPhone: f.phone.trim(),
        customerEmail: f.email.trim() || undefined,
        customerAddress: address,
        zipCode: f.zip.trim(),
        vehicleDescription: vehicle,
        vehicleYear: f.year.trim(),
        vehicleMake: f.make.trim(),
        vehicleModel: f.model.trim(),
        vehicleClass: suggestedVehicleClass(vehicle),
        vin: normalizeVinInput(f.vin) || undefined,
        licensePlate: normalizePlate(f.plate) || undefined,
        issueDescription: notes.trim() || undefined,
        services: ['diagnostic'],
        locationType: 'mobile',
        preferredDate: date,
        preferredTimeWindow: timeWindow,
        techBooking: true,
        workOrder: order ? { lines, partsPickup } : undefined,
      });
      setBooked({ ref: result.bookingReference, already: result.alreadyBooked === true });
      onBooked();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not book the job');
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <div className="sticky top-0 z-10 -mx-4 flex items-center gap-1 border-b border-white/[0.06] bg-[#0b0c10]/95 px-2 py-1.5 backdrop-blur">
      <button type="button" onClick={onBack} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/5">
        <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>
      <h2 className="font-heading text-base font-bold">New phone job</h2>
    </div>
  );

  if (booked) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="space-y-4 py-6">
          <div className={`${cardClass} space-y-2 p-5`}>
            <p className="flex items-center gap-2 font-heading text-xl font-bold">
              <Check className="h-6 w-6 text-emerald-400" aria-hidden="true" /> Booked · {booked.ref}
            </p>
            <p className="text-[15px] text-slate-300">
              {booked.already
                ? 'This customer already booked this vehicle in the last hour, so no second job was made. This is their booking.'
                : `It’s on your Booked list, and dispatch can see the work order. The customer gets a text at ${displayPhone(f.phone)}.`}
            </p>
            {estimate && !booked.already && (
              <p className="text-[15px] text-slate-300">
                Estimate {formatCents(estimate.totalCents)} · your payout {formatCents(estimate.techPayoutCents)}
              </p>
            )}
          </div>
          <button type="button" onClick={onBack} className="min-h-[52px] w-full rounded-2xl bg-brand font-heading text-base font-bold text-[#0b0c10]">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {header}
      <div className="flex-1 space-y-4 py-4">
        <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="pj-customer">
          <h3 id="pj-customer" className={capClass}>Customer</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="pj-first" className={label}>First name</label>
              <input id="pj-first" autoComplete="off" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} className={input(errors.firstName)} />
              <Err msg={errors.firstName} />
            </div>
            <div>
              <label htmlFor="pj-last" className={label}>Last name</label>
              <input id="pj-last" autoComplete="off" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} className={input(errors.lastName)} />
              <Err msg={errors.lastName} />
            </div>
          </div>
          <div>
            <label htmlFor="pj-phone" className={label}>Phone</label>
            <input id="pj-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input(errors.phone)} />
            <Err msg={errors.phone} />
          </div>
          <div>
            <label htmlFor="pj-email" className={label}>
              Email <span className="normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input id="pj-email" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input(errors.email)} />
            <Err msg={errors.email} />
          </div>
          <div>
            <label htmlFor="pj-street" className={label}>Service address</label>
            <input id="pj-street" placeholder="Street" value={f.street} onChange={(e) => set('street', e.target.value)} className={input(errors.street)} />
            <Err msg={errors.street} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2.5">
            <div>
              <input aria-label="City" placeholder="City" value={f.city} onChange={(e) => set('city', e.target.value)} className={input(errors.city)} />
              <Err msg={errors.city} />
            </div>
            <div>
              <input
                aria-label="ZIP"
                placeholder="ZIP"
                inputMode="numeric"
                maxLength={5}
                value={f.zip}
                onChange={(e) => {
                  const zip = e.target.value.replace(/\D/g, '').slice(0, 5);
                  set('zip', zip);
                  const info = zip.length === 5 ? lookupServiceZip(zip) : null;
                  if (info && !f.city.trim()) set('city', info.city);
                }}
                className={input(errors.zip)}
              />
              <Err msg={errors.zip} />
            </div>
          </div>
          {outsideArea && <p className="text-[13px] text-amber-300">That ZIP is outside the service area, so it can’t be booked here. Call dispatch.</p>}
        </section>

        <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="pj-vehicle">
          <h3 id="pj-vehicle" className={capClass}>Vehicle</h3>
          <div>
            <label htmlFor="pj-vin" className={label}>
              VIN <span className="normal-case tracking-normal font-normal">(optional, fills in the rest)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="pj-vin"
                autoCapitalize="characters"
                maxLength={20}
                value={f.vin}
                onChange={(e) => {
                  set('vin', normalizeVinInput(e.target.value));
                  setVinState({ busy: false, msg: null });
                }}
                className={`${input(errors.vin)} font-heading tracking-[0.06em]`}
              />
              <button
                type="button"
                onClick={() => void decodeVin()}
                disabled={vinState.busy || normalizeVinInput(f.vin).length !== 17}
                className="min-h-[48px] shrink-0 rounded-xl border border-white/[0.14] px-3.5 text-sm font-semibold disabled:opacity-40"
              >
                {vinState.busy ? 'Decoding…' : 'Decode'}
              </button>
            </div>
            <Err msg={errors.vin} />
            {vinState.msg && <p className="mt-1 text-[13px] text-slate-300">{vinState.msg}</p>}
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2.5">
            <div>
              <label htmlFor="pj-year" className={label}>Year</label>
              <input id="pj-year" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} className={input(errors.year)} />
              <Err msg={errors.year} />
            </div>
            <div>
              <label htmlFor="pj-make" className={label}>Make</label>
              <input id="pj-make" value={f.make} onChange={(e) => set('make', e.target.value)} className={input(errors.make)} />
              <Err msg={errors.make} />
            </div>
          </div>
          <div>
            <label htmlFor="pj-model" className={label}>Model</label>
            <input id="pj-model" value={f.model} onChange={(e) => set('model', e.target.value)} className={input(errors.model)} />
            <Err msg={errors.model} />
          </div>
          <div>
            <label htmlFor="pj-plate" className={label}>
              License plate <span className="normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              id="pj-plate"
              autoCapitalize="characters"
              value={f.plate}
              onChange={(e) => set('plate', normalizePlate(e.target.value))}
              className={`${input(errors.plate)} font-heading tracking-[0.06em]`}
            />
            <Err msg={errors.plate} />
          </div>
        </section>

        <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="pj-needs">
          <h3 id="pj-needs" className={capClass}>What it needs</h3>
          {lines.map((l, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-[#0b0c10] p-3">
              <div className="flex gap-2">
                <input
                  aria-label={`Part or job ${i + 1}`}
                  placeholder="Part or job, e.g. Spark plugs"
                  value={l.title}
                  onChange={(e) => setLine(i, { title: e.target.value })}
                  className={input()}
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((cur) => cur.filter((_, j) => j !== i))}
                    aria-label={`Remove line ${i + 1}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`pj-parts-${i}`} className="mb-1 block text-[11px] font-semibold text-slate-400">Part price (with upcharge)</label>
                  <input id={`pj-parts-${i}`} inputMode="decimal" placeholder="$0.00" value={l.parts} onChange={(e) => setLine(i, { parts: e.target.value })} className={input()} />
                </div>
                <div>
                  <label htmlFor={`pj-labor-${i}`} className="mb-1 block text-[11px] font-semibold text-slate-400">Labor</label>
                  <input id={`pj-labor-${i}`} inputMode="decimal" placeholder="$0.00" value={l.labor} onChange={(e) => setLine(i, { labor: e.target.value })} className={input()} />
                </div>
              </div>
            </div>
          ))}
          {lines.length < WORK_ORDER_MAX_LINES && (
            <button
              type="button"
              onClick={() => setLines((cur) => [...cur, emptyLine()])}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.14] px-3 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add another
            </button>
          )}
          <label className="flex min-h-[48px] items-center gap-3 rounded-xl bg-[#0b0c10] px-3.5">
            <input type="checkbox" checked={partsPickup} onChange={(e) => setPartsPickup(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
            <span className="text-[15px]">Add 10% parts pickup fee</span>
          </label>
          <div>
            <label htmlFor="pj-notes" className={label}>
              Notes for dispatch <span className="normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <textarea id="pj-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input()} py-3`} />
          </div>
        </section>

        <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="pj-when">
          <h3 id="pj-when" className={capClass}>When</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" aria-label="Date" min={todayISODate()} value={date} onChange={(e) => setDate(e.target.value)} className={input()} />
            <select aria-label="Time window" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className={input()}>
              {PREFERRED_TIME_WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className={`${cardClass} space-y-1.5 p-4`} aria-labelledby="pj-estimate">
          <h3 id="pj-estimate" className={`${capClass} mb-1`}>Estimate</h3>
          {estimate ? (
            <>
              {[
                ['Diagnostic', estimate.diagnosticCents],
                ['Travel', estimate.travelCents],
                ['Labor', estimate.laborCents],
                ['Parts', estimate.partsCents],
                ...(estimate.partsPickupCents ? [['Parts pickup 10%', estimate.partsPickupCents] as const] : []),
                ['Sales tax on parts', estimate.taxCents],
              ].map(([name, cents]) => (
                <p key={name} className="flex justify-between text-[15px] text-slate-300">
                  <span>{name}</span>
                  <span className="font-heading">{formatCents(cents as number)}</span>
                </p>
              ))}
              <p className="flex justify-between border-t border-white/[0.08] pt-2 text-[17px] font-bold">
                <span>Customer pays</span>
                <span className="font-heading">{formatCents(estimate.totalCents)}</span>
              </p>
              <p className="flex justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5 text-[17px] font-bold text-emerald-200">
                <span>Your payout</span>
                <span className="font-heading">{formatCents(estimate.techPayoutCents)}</span>
              </p>
              <p className="text-xs text-slate-400">70% of diagnostic and labor, plus travel, the pickup fee and the parts you buy.</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Add what it needs to see the price and your payout. With nothing added it books as a ${DIAGNOSTIC_FEE_DOLLARS} diagnostic visit.
            </p>
          )}
        </section>

        <label className={`${cardClass} flex items-start gap-3 p-4`}>
          <input type="checkbox" checked={f.agreed} onChange={(e) => set('agreed', e.target.checked)} className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-brand" />
          <span className="text-[13px] leading-relaxed text-slate-300">
            I read the customer the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-soft hover:underline">
              Terms of Service
            </a>{' '}
            summary (the ${DIAGNOSTIC_FEE_DOLLARS} diagnostic is its own charge, ${TRAVEL_FEE_DOLLARS} travel, sales tax, the 12-month warranty on parts we supply) and they
            agreed, including texts about this visit. They can reply STOP to opt out.
          </span>
        </label>
        <Err msg={errors.agreed} />
      </div>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-white/[0.06] bg-[#0b0c10] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {submitError && <p className="text-[13px] text-amber-300">{submitError}</p>}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || outsideArea}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-brand font-heading text-[17px] font-bold text-[#0b0c10] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Booking…
            </>
          ) : (
            `Book job${estimate ? ` · ${formatCents(estimate.totalCents)}` : ''}`
          )}
        </button>
      </div>
    </div>
  );
};
