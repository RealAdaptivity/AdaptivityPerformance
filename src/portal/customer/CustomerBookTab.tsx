import React, { useMemo, useState } from 'react';
import type { PortalProfile } from '../portalAuth';
import { createBookingWithCardHold } from '../../services/stripePaymentsApi';
import { StripeBookingHoldSection } from '../../components/StripeBookingHoldSection';
import { loadGarageVehicles, vehicleLabel } from './garageStorage';

const SERVICES = [
  { id: 's1', title: 'Full Synthetic Mobile Oil Service', price: 149 },
  { id: 's2', title: 'Performance Ceramic Brake Service', price: 349 },
  { id: 's4', title: 'Full Mobile Digital Inspection (DVI)', price: 89 },
  { id: 's5', title: 'AGM Battery & Charging Diagnostics', price: 269 },
];

type Props = {
  profile: PortalProfile;
  preselectedVehicleId?: string;
  onGoTrack: () => void;
};

export const CustomerBookTab: React.FC<Props> = ({ profile, preselectedVehicleId, onGoTrack }) => {
  const vehicles = useMemo(() => loadGarageVehicles(), []);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId || vehicles[0]?.id || '');
  const [selected, setSelected] = useState<string[]>(['s1']);
  const [address, setAddress] = useState('1234 Canyon Falls Dr, Northlake, TX 76226');
  const [zip, setZip] = useState('76226');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'form' | 'card' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState('');
  const [holdAmount, setHoldAmount] = useState(0);

  const vehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  const subtotal = SERVICES.filter((s) => selected.includes(s.id)).reduce((a, s) => a + s.price, 0);
  const dispatchFee = 25;
  const tax = Math.round(subtotal * 0.0825);
  const holdTotal = subtotal + dispatchFee + tax;

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      const serviceTitles = SERVICES.filter((s) => selected.includes(s.id)).map((s) => s.title);
      const hold = await createBookingWithCardHold({
        customerName: profile.fullName || profile.email.split('@')[0],
        customerPhone: phone.trim(),
        customerEmail: profile.email,
        customerAddress: `${address.trim()}${notes ? ` · ${notes}` : ''}`,
        zipCode: zip.trim() || '76247',
        vehicleDescription: vehicle ? vehicleLabel(vehicle) : 'Customer vehicle',
        vin: vehicle?.vin,
        services: serviceTitles,
        holdAmountDollars: holdTotal,
        locationType: 'mobile',
      });
      setHoldAmount(holdTotal);
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
          Reference <span className="font-mono text-orange-400">{bookingRef}</span> · hold ${holdAmount.toFixed(2)}
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
          {SERVICES.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                selected.includes(s.id) ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10'
              }`}
            >
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="text-xs text-slate-200 flex-1">{s.title}</span>
              <span className="text-xs font-bold text-white">${s.price}</span>
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
      <textarea
        placeholder="Notes / parking"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-xs"
      />
      <p className="text-sm text-white font-bold">Hold preview: ${holdTotal.toFixed(2)}</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={() => void startHold()}
        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl text-xs font-bold text-white disabled:opacity-60"
      >
        {loading ? 'Preparing secure hold…' : 'Continue to card on file →'}
      </button>
    </div>
  );
};
