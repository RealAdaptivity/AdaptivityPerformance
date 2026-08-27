import React, { useMemo, useState } from 'react';
import type { PortalProfile } from '../portalAuth';
import { SERVICE_CATALOG } from '../../services/serviceCatalog';
import { ServiceIcon } from '../../components/ServiceIcon';
import { loadGarageVehicles, vehicleLabel } from './garageStorage';
import type { RebookPrefill } from './CustomerHistoryTab';
import { matchCatalogFromLabel } from '../../services/serviceCatalog';
import { createBooking } from '../../services/bookingsApi';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../../services/scheduleWindows';
import { isIncompleteServiceAddress } from '../../services/serviceAddress';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../../site/seo';
import {
  ShieldCheck,
  Loader2,
  Phone,
  Car,
} from 'lucide-react';

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
    preselectedVehicleId || matchedVehicle?.id || (vehicles.length > 0 ? vehicles[0].id : 'new')
  );

  // Custom vehicle inputs if "new" or no saved vehicles
  const [customYear, setCustomYear] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customVin, setCustomVin] = useState('');

  const [symptoms, setSymptoms] = useState('');
  const [selected, setSelected] = useState<string[]>(() => catalogIdsFromTitles(prefill?.services));
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDate, setPreferredDate] = useState(todayISODate());
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const selectedGarageVehicle = vehicles.find((v) => v.id === vehicleId);

  const resolvedVehicleString = useMemo(() => {
    if (selectedGarageVehicle) {
      return vehicleLabel(selectedGarageVehicle);
    }
    const custom = [customYear.trim(), customMake.trim(), customModel.trim()]
      .filter(Boolean)
      .join(' ');
    return custom || 'Customer Vehicle';
  }, [selectedGarageVehicle, customYear, customMake, customModel]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : ['diagnostic'];
      }
      return [...prev, id];
    });
  };

  const handleBook = async () => {
    setError(null);

    if (vehicleId === 'new' || vehicles.length === 0) {
      if (!customYear.trim() || !customMake.trim() || !customModel.trim()) {
        setError('Please enter your vehicle Year, Make, and Model.');
        return;
      }
    }

    if (!selected.length) {
      setError('Select at least one service.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (isIncompleteServiceAddress(address)) {
      setError(
        'Enter a full street address with street name and city (e.g. 1234 Canyon Falls Dr, Northlake).'
      );
      return;
    }
    setLoading(true);
    try {
      const selectedTitles = SERVICE_CATALOG.filter((s) => selected.includes(s.id)).map(
        (s) => s.title
      );

      const combinedNotes = [
        symptoms.trim() ? `Issue/Symptoms: ${symptoms.trim()}` : '',
        notes.trim() ? `Location/Access Notes: ${notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const created = await createBooking(
        {
          customerName: profile.fullName || profile.email.split('@')[0],
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          zipCode: zip.trim() || '76247',
          vehicle: resolvedVehicleString,
          vin: selectedGarageVehicle?.vin || (customVin.trim() ? customVin.trim().toUpperCase() : undefined),
          services: selectedTitles.length ? selectedTitles : ['Diagnostic Visit'],
          totalEstimate: 85,
          locationType: 'mobile',
          distanceMiles: 5,
          etaMinutes: 15,
          preferredDate,
          preferredTimeWindow: preferredTime,
          customerNotes: combinedNotes || undefined,
          preferredMechanicId: prefill?.preferredMechanicId || null,
        },
        profile.id
      );

      const ref = created?.id || 'AP-' + Math.floor(1000 + Math.random() * 9000);
      setBookingRef(ref);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit booking');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="bg-[#12141c] border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <div>
          <p className="text-emerald-400 font-bold text-lg">Appointment Booked &amp; Confirmed!</p>
          <p className="text-xs text-slate-300 mt-1">Zero payment charged today • Pay on completion</p>
          <p className="font-mono text-orange-400 text-base font-bold mt-2">#{bookingRef}</p>
        </div>

        <div className="p-3 bg-[#0b0c10] rounded-xl border border-white/10 text-xs text-slate-400 text-left space-y-1">
          <div><strong className="text-white">Vehicle:</strong> {resolvedVehicleString}</div>
          {symptoms && <div><strong className="text-white">Issue:</strong> {symptoms}</div>}
          <div><strong className="text-white">Date &amp; Time:</strong> {preferredDate} ({preferredTime})</div>
          <div><strong className="text-white">Location:</strong> {address}</div>
        </div>

        <button
          type="button"
          onClick={onGoTrack}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl text-xs font-bold text-white shadow-lg"
        >
          Track this job in your portal →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zero Payment Due Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Zero Due Today • Pay Technician On Completion</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          No payment is required to book. Your technician will inspect on site, agree on labor + parts pricing with you, and payment is processed upon job completion.
        </p>
      </div>

      {/* Vehicle Selection or Custom Entry */}
      <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-orange-400" /> Vehicle Information
          </span>
          <span className="text-[10px] text-slate-400">Year · Make · Model</span>
        </div>

        {vehicles.length > 0 && (
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
              Select Saved Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
              <option value="new">+ Enter different vehicle</option>
            </select>
          </div>
        )}

        {(vehicleId === 'new' || vehicles.length === 0) && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Year *
                </label>
                <input
                  type="text"
                  required
                  placeholder="2021"
                  maxLength={4}
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Make *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ford"
                  value={customMake}
                  onChange={(e) => setCustomMake(e.target.value)}
                  className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="F-150"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                VIN Number <span className="text-slate-500 lowercase">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="17-character VIN"
                maxLength={17}
                value={customVin}
                onChange={(e) => setCustomVin(e.target.value.toUpperCase())}
                className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs tracking-wider"
              />
            </div>
          </div>
        )}
      </div>

      {/* What's Going On / Problem Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-300">
            What&apos;s going on with your vehicle? <span className="text-orange-400">*</span>
          </label>
          <span className="text-[10px] text-slate-400">Symptoms &amp; details</span>
        </div>
        <textarea
          rows={3}
          required
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
          placeholder="Describe what's happening (e.g. check engine light is on, brakes grinding, car won't start, leaking fluid, vibration at highway speeds)..."
        />
      </div>

      {/* Services Selection */}
      <div>
        <p className="text-xs font-semibold text-slate-300 mb-2">Service Category</p>
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
              <ServiceIcon kind={s.kind} id={s.id} />
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-slate-200 font-bold">
                  {s.title}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {s.description}
                </span>
              </span>
              <span className="text-[11px] font-bold text-emerald-400 shrink-0">Zero Due Now</span>
            </label>
          ))}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1">
          Mobile Service Address <span className="text-orange-400">*</span>
        </label>
        <input
          placeholder="e.g. 1234 Canyon Falls Dr, Northlake, TX"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Zip Code</label>
          <input
            placeholder="76226"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Phone Number <span className="text-orange-400">*</span>
          </label>
          <input
            placeholder="(940) 304-0620"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Preferred date</span>
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
          <span className="text-[10px] uppercase font-bold text-slate-400">Time window</span>
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

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1">
          Access / Parking Notes (Optional)
        </label>
        <textarea
          placeholder="e.g. Parked in driveway, gate code #1234..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-xs"
        />
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">{error}</p>}

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleBook()}
        className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 rounded-xl text-xs font-black text-white disabled:opacity-60 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Confirming booking…</span>
          </>
        ) : (
          <span>Confirm Appointment (Zero Due Today) →</span>
        )}
      </button>

      <div className="text-center pt-1">
        <a
          href={SITE_PHONE_TEL}
          className="text-xs text-slate-400 hover:text-orange-400 font-semibold flex items-center justify-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-orange-400" />
          <span>Or call live dispatch: {SITE_PHONE_DISPLAY}</span>
        </a>
      </div>
    </div>
  );
};
