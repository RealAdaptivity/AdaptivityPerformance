import React, { useMemo, useState } from 'react';
import type { PortalProfile } from '../portalAuth';
import { createBookingWithCardHold } from '../../services/stripePaymentsApi';
import { StripeBookingHoldSection } from '../../components/StripeBookingHoldSection';
import { SERVICE_CATALOG } from '../../services/serviceCatalog';
import { computeHoldQuote } from '../../services/holdPricing';
import { loadGarageVehicles, vehicleLabel } from './garageStorage';
import { CUSTOMER_TECH_LIABILITY_NOTICE } from '../../content/contractorLiability';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../../services/scheduleWindows';
import { applyReferralCodeOnBooking } from '../../services/referrals';
import type { RebookPrefill } from './CustomerHistoryTab';
import { matchCatalogFromLabel } from '../../services/serviceCatalog';

type Props = {
  profile: PortalProfile;
  preselectedVehicleId?: string;
  prefill?: RebookPrefill;
  onGoTrack: () => void;
};

function catalogIdsFromTitles(titles: string[] | undefined): string[] {
  if (!titles?.length) return ['diagnostic'];
  const ids = titles
    .map((t) => matchCatalogFromLabel(t)?.id || SERVICE_CATALOG.find((s) => s.title === t)?.id)
    .filter((id): id is string => Boolean(id));
  return ids.length ? [...new Set(ids)] : ['diagnostic'];
}

export const CustomerBookTab: React.FC<Props> = ({
  profile,
  preselectedVehicleId,
  prefill,
  onGoTrack,
}) => {
  const vehicles = useMemo(() => loadGarageVehicles(), []);
  const matchedVehicle = useMemo(() => {
    if (!prefill?.vehicleDescription) return undefined;
    const needle = prefill.vehicleDescription.toLowerCase();
    return vehicles.find((v) => vehicleLabel(v).toLowerCase() === needle);
  }, [vehicles, prefill?.vehicleDescription]);
  const [vehicleId, setVehicleId] = useState(
    preselectedVehicleId || matchedVehicle?.id || vehicles[0]?.id || ''
  );
  const [selected, setSelected] = useState<string[]>(() => catalogIdsFromTitles(prefill?.services));
  const [address, setAddress] = useState('1234 Canyon Falls Dr, Northlake, TX 76226');
  const [zip, setZip] = useState('76226');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [preferredDate, setPreferredDate] = useState(todayISODate());
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [step, setStep] = useState<'form' | 'card' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState('');
  const [holdAmount, setHoldAmount] = useState(0);

  const vehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  const quote = useMemo(() => computeHoldQuote(selected), [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : ['diagnostic'];
      }
      // Mixing diagnostic with direct-book: keep selection; hold becomes diagnostic ($100)
      return [...prev, id];
    });
  };

  const startHold = async () => {
    setError(null);
    if (!selected.length) {
      setError('Select at least one service.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone is required.');
      return;
    }
    setLoading(true);
    try {
      const serviceTitles = quote.services.map((s) => s.title);
      const hold = await createBookingWithCardHold({
        customerName: profile.fullName || profile.email.split('@')[0],
        customerPhone: phone.trim(),
        customerEmail: profile.email,
        customerAddress: address.trim(),
        zipCode: zip.trim() || '76247',
        vehicleDescription: vehicle ? vehicleLabel(vehicle) : 'Customer vehicle',
        vin: vehicle?.vin,
        services: serviceTitles,
        holdAmountDollars: quote.holdDollars,
        locationType: 'mobile',
        preferredDate,
        preferredTimeWindow: preferredTime,
        customerNotes: notes.trim() || undefined,
        ...applyReferralCodeOnBooking(referralInput),
        preferredMechanicId: prefill?.preferredMechanicId || undefined,
      });
      setHoldAmount(hold.holdAmountDollars ?? quote.holdDollars);
      setBookingRef(hold.bookingReference);
      setClientSecret(hold.clientSecret);
      setStep('card');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start booking');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="bg-[#12141c] border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
        <p className="text-emerald-400 font-bold">Card saved — hold authorized</p>
        <p className="font-mono text-orange-400 text-lg">{bookingRef}</p>
        <button type="button" onClick={onGoTrack} className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white">
          Track this job →
        </button>
      </div>
    );
  }

  if (step === 'card' && clientSecret) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Reference <span className="font-mono text-orange-400">{bookingRef}</span> · hold $
          {holdAmount.toFixed(2)}
        </p>
        <StripeBookingHoldSection
          clientSecret={clientSecret}
          holdAmountDollars={holdAmount}
          customerName={profile.fullName || 'Customer'}
          customerEmail={profile.email}
          onAuthorized={() => setStep('done')}
        />
        <button type="button" onClick={() => setStep('form')} className="text-xs text-slate-500">
          ← Back to details
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-3 py-2.5 space-y-2">
        <p className="text-[11px] text-orange-200/95 leading-relaxed">
          <strong>How quoting works:</strong> most visits start with a{' '}
          <strong>$100 diagnostic hold</strong>. Your tech inspects on site, agrees labor + parts pricing
          with you, then charges through Adaptivity (tech 70% · platform 30%).
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{CUSTOMER_TECH_LIABILITY_NOTICE}</p>
      </div>

      {vehicles.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-slate-300">Vehicle</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full mt-1 bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-slate-300 mb-2">Services</p>
        <div className="space-y-2">
          {SERVICE_CATALOG.map((s) => (
            <label
              key={s.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                selected.includes(s.id) ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-slate-200 font-semibold">
                  {s.icon} {s.title}
                  {s.directBook ? (
                    <span className="ml-2 text-[10px] font-bold text-emerald-400/90">DIRECT</span>
                  ) : (
                    <span className="ml-2 text-[10px] font-bold text-sky-300/90">ON-SITE PRICE</span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {s.description}
                </span>
              </span>
              <span className="text-xs font-bold text-amber-400/90 shrink-0">$100 hold</span>
            </label>
          ))}
        </div>
      </div>
      <input
        placeholder="Mobile service address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
        />
        <input
          placeholder="Phone *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Preferred date</span>
          <input
            type="date"
            required
            min={todayISODate()}
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Time window</span>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          >
            {PREFERRED_TIME_WINDOWS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        placeholder="Notes / parking / symptoms"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-xs"
      />
      <input
        placeholder="Referral code (optional)"
        value={referralInput}
        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm font-mono"
        autoCapitalize="characters"
      />
      <div className="rounded-xl bg-[#0b0c10] border border-white/10 p-3 space-y-1">
        <p className="text-sm text-white font-bold">
          Card hold: ${quote.holdDollars.toFixed(2)}{' '}
          <span className="text-[11px] font-semibold text-slate-400">
            ({quote.mode === 'direct' ? 'direct service' : 'diagnostic'})
          </span>
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{quote.explanation}</p>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={() => void startHold()}
        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl text-xs font-bold text-white disabled:opacity-60"
      >
        {loading ? 'Preparing secure hold…' : `Continue to card hold ($${quote.holdDollars}) →`}
      </button>
    </div>
  );
};
