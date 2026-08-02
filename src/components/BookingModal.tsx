import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, MapPin, Truck, Home, ShieldCheck, Loader2, Share2, Star } from 'lucide-react';
import { createBookingWithCardHold } from '../services/stripePaymentsApi';
import { StripeBookingHoldSection } from './StripeBookingHoldSection';
import { computeHoldQuote } from '../services/holdPricing';
import { fetchApprovedPartners, type PartnerLocation } from '../services/partners';
import { CUSTOMER_TECH_LIABILITY_NOTICE } from '../content/contractorLiability';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../services/scheduleWindows';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';
import { applyReferralCodeOnBooking } from '../services/referrals';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimateData?: {
    vehicle?: string;
    vin?: string;
    locationType?: 'mobile' | 'shop';
    serviceAddress?: string;
    services?: string[];
    totalEstimate?: number;
    calculatedDistanceMiles?: number;
    partnerLocationId?: string;
    referralCode?: string;
    preferredMechanicId?: string;
  };
  onBookingSubmitted?: (result: {
    bookingReference: string;
    holdAmountDollars: number;
    name: string;
    phone: string;
    vehicle: string;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialEstimateData,
  onBookingSubmitted,
}) => {
  const [step, setStep] = useState(1);
  const [serviceMode, setServiceMode] = useState<'mobile' | 'shop'>('mobile');
  const [vehicle, setVehicle] = useState('2020 Ford F-150');
  const [vinNumber, setVinNumber] = useState('');
  const [serviceRequested, setServiceRequested] = useState('Mobile Diagnostic Visit');
  const [preferredDate, setPreferredDate] = useState(todayISODate());
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [streetAddress, setStreetAddress] = useState('1234 Canyon Falls Dr');
  const [zipCode, setZipCode] = useState('76226');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [holdAmount, setHoldAmount] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCreatingHold, setIsCreatingHold] = useState(false);
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [partnerLocationId, setPartnerLocationId] = useState<string>('');

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerLocationId) || partners[0] || null,
    [partners, partnerLocationId]
  );

  const holdQuote = useMemo(() => {
    const fromField = serviceRequested
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const fromInitial = initialEstimateData?.services || [];
    return computeHoldQuote(fromField.length ? fromField : fromInitial.length ? fromInitial : ['diagnostic']);
  }, [serviceRequested, initialEstimateData?.services]);
  const holdPreview = holdQuote.holdDollars;

  useEffect(() => {
    if (initialEstimateData) {
      if (initialEstimateData.vehicle) setVehicle(initialEstimateData.vehicle);
      if (initialEstimateData.vin) setVinNumber(initialEstimateData.vin);
      if (initialEstimateData.locationType) setServiceMode(initialEstimateData.locationType);
      if (initialEstimateData.serviceAddress) setStreetAddress(initialEstimateData.serviceAddress);
      if (initialEstimateData.services && initialEstimateData.services.length > 0) {
        setServiceRequested(initialEstimateData.services.join(', '));
      }
      if (initialEstimateData.partnerLocationId) {
        setPartnerLocationId(initialEstimateData.partnerLocationId);
        setServiceMode('shop');
      }
      if (initialEstimateData.referralCode) {
        setReferralInput(initialEstimateData.referralCode.toUpperCase());
      }
    }
  }, [initialEstimateData]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setClientSecret(null);
      setSubmitError(null);
      setBookingRef('');
      return;
    }
    void fetchApprovedPartners()
      .then((list) => {
        setPartners(list);
        setPartnerLocationId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          const owned = list.find((p) => p.isAdaptivityOwned);
          return owned?.id || list[0]?.id || '';
        });
      })
      .catch(() => setPartners([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const buildAddress = () => {
    if (serviceMode === 'mobile') {
      return `${streetAddress.trim()}, ${zipCode.trim()}`;
    }
    return selectedPartner
      ? `${selectedPartner.businessName} • ${selectedPartner.address}`
      : 'Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247';
  };

  const handleContinueToCardHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsCreatingHold(true);
    const amount = holdPreview;
    setHoldAmount(amount);

    try {
      const servicesList = serviceRequested
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const hold = await createBookingWithCardHold({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        customerAddress: buildAddress(),
        zipCode:
          serviceMode === 'shop'
            ? selectedPartner?.zipCode || zipCode.trim() || '76247'
            : zipCode.trim() || '76247',
        vehicleDescription: vehicle.trim(),
        vin: vinNumber.trim() || undefined,
        services: servicesList.length ? servicesList : [serviceRequested.trim()],
        holdAmountDollars: amount,
        locationType: serviceMode,
        partnerLocationId:
          serviceMode === 'shop' ? selectedPartner?.id || partnerLocationId || undefined : undefined,
        preferredDate,
        preferredTimeWindow: preferredTime,
        customerNotes: notes.trim() || undefined,
        preferredMechanicId: initialEstimateData?.preferredMechanicId || undefined,
        ...applyReferralCodeOnBooking(referralInput),
      });

      setBookingRef(hold.bookingReference);
      setClientSecret(hold.clientSecret);
      setStep(3);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not start card hold');
    } finally {
      setIsCreatingHold(false);
    }
  };

  const handleCardAuthorized = () => {
    onBookingSubmitted?.({
      bookingReference: bookingRef,
      holdAmountDollars: holdAmount,
      name: fullName,
      phone,
      vehicle,
    });
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#12141c] w-full max-w-xl rounded-3xl border border-orange-500/40 shadow-2xl overflow-hidden relative text-white max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#181a26] to-[#0e1017] p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">Schedule Service • Adaptivity Performance</h3>
              <p className="text-xs text-slate-400">
                Step {step} of 4 • Card hold, charge on completion
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <form onSubmit={() => setStep(2)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Service Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setServiceMode('mobile')}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                      serviceMode === 'mobile'
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-white/10 bg-[#0b0c10] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-orange-400" />
                      <span>Mobile (We Come to You)</span>
                    </div>
                    <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-mono">
                      $2.00/mi
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode('shop')}
                    className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
                      serviceMode === 'shop'
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-white/10 bg-[#0b0c10] text-slate-400'
                    }`}
                  >
                    <Home className="w-4 h-4 text-orange-400" />
                    <span>Drop Off at Shop / Partner</span>
                  </button>
                </div>
              </div>

              {serviceMode === 'shop' && partners.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Choose shop / garage partner
                  </label>
                  <select
                    value={partnerLocationId}
                    onChange={(e) => setPartnerLocationId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.businessName}
                        {p.city ? ` — ${p.city}` : ''}
                        {p.hasLift ? ' · Lift' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Vehicle Details</label>
                  <input
                    type="text"
                    required
                    value={vehicle}
                    onChange={e => setVehicle(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="e.g. 2021 Chevy Silverado 1500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">VIN Number (Optional)</label>
                  <input
                    type="text"
                    value={vinNumber}
                    onChange={e => setVinNumber(e.target.value.toUpperCase())}
                    maxLength={17}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:border-orange-500 focus:outline-none uppercase"
                    placeholder="17-Digit VIN"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Services Needed</label>
                <input
                  type="text"
                  required
                  value={serviceRequested}
                  onChange={e => setServiceRequested(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  placeholder="e.g. Brakes, Check Engine Light, Oil Change"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Time Window</label>
                  <select
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  >
                    {PREFERRED_TIME_WINDOWS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Card hold at booking:{' '}
                <strong className="text-orange-400">${holdPreview.toFixed(2)}</strong>
                <span className="block text-slate-500 mt-1">
                  {holdQuote.mode === 'direct' ? 'Service hold' : '$100 diagnostic'} —{' '}
                  {holdQuote.explanation}
                </span>
                <span className="block text-amber-400/90 mt-1.5">
                  Card hold only at booking. Your tech diagnoses on site, sets labor + parts pricing with you,
                  then charges through Adaptivity (tech 70% · platform 30%). Affirm, Afterpay, Zip, Sunbit, or
                  Klarna may appear at final checkout when eligible.
                </span>
                <span className="block text-slate-500 mt-1.5">{CUSTOMER_TECH_LIABILITY_NOTICE}</span>
              </p>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all"
              >
                Next: Location & Contact Details →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleContinueToCardHold} className="space-y-4">
              {serviceMode === 'mobile' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Service Address (Home / Workplace)</label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={e => setStreetAddress(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="e.g. 1234 Canyon Falls Dr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Zip Code (DFW / Fort Worth)</label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={e => setZipCode(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="76102, 76011, 76247…"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" /> Drop-off location:
                  </div>
                  {selectedPartner ? (
                    <>
                      <p className="text-white font-semibold">{selectedPartner.businessName}</p>
                      <p>{selectedPartner.address}</p>
                      {selectedPartner.hoursNote && (
                        <p className="text-slate-500">{selectedPartner.hoursNote}</p>
                      )}
                    </>
                  ) : (
                    <p>Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="(940) 304-0620"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email (for receipt & card on file)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Additional Issue Notes / Parking Info</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="e.g. Parked on left side driveway, key will be under mat."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Referral code (optional)</label>
                <input
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  placeholder="Friend's code"
                  autoCapitalize="characters"
                />
              </div>

              <div className="bg-[#0b0c10] border border-orange-500/30 p-3.5 rounded-xl space-y-2 text-[11px] text-slate-300">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    defaultChecked
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-900 flex-shrink-0"
                  />
                  <span>
                    I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 font-bold hover:underline">Adaptivity Terms of Service & Legal Policy</a> (including $100 diagnostic fee credit policy, 12-Month Warranty, 50-mile lug re-torque duty, Mechanics' Lien §70.001, and Denton County jurisdiction). I authorize electronic signature under the federal E-SIGN Act.
                  </span>
                </label>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/30 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 font-bold block">Card hold — charge when complete</strong>
                  <span>
                    Next step saves your card and places a <strong className="text-white">${holdPreview.toFixed(2)}</strong>{' '}
                    authorization hold
                    {holdQuote.mode === 'diagnostic'
                      ? ' for the diagnostic visit — your tech sets repair pricing on site'
                      : ' until the job is completed'}
                    . You are charged when the job is finished; your
                    technician receives 70% through official platform checkout.
                  </span>
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{submitError}</p>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHold}
                  className="w-2/3 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isCreatingHold ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing secure hold…
                    </>
                  ) : (
                    <>Continue to card on file →</>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && clientSecret && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Appointment <span className="font-mono text-orange-400 font-bold">#{bookingRef}</span>
              </p>
              <StripeBookingHoldSection
                clientSecret={clientSecret}
                holdAmountDollars={holdAmount}
                customerName={fullName}
                customerEmail={email}
                onAuthorized={handleCardAuthorized}
              />
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                ← Back to contact details
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <div>
                <span className="text-xs bg-orange-500/10 text-orange-400 font-mono font-bold px-3 py-1 rounded-full border border-orange-500/30">
                  Confirmation #{bookingRef}
                </span>
                <h3 className="font-heading text-2xl font-bold text-white mt-2">Appointment booked — card on file</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                  A <strong className="text-white">${holdAmount.toFixed(2)}</strong> hold is active for your
                  visit. We&apos;ll charge your card when the job is complete. Dispatch will reach you at{' '}
                  <strong className="text-white">{phone}</strong> to confirm technician assignment.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/10 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Service Mode:</span>
                  <span className="font-bold text-white capitalize">{serviceMode} Service</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="font-bold text-white">{vehicle}</span>
                </div>
                {vinNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">VIN Number:</span>
                    <span className="font-bold font-mono text-orange-400">{vinNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled:</span>
                  <span className="font-bold text-orange-400">{preferredDate} ({preferredTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hold amount:</span>
                  <span className="font-bold text-emerald-400">${holdAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 12-Month / 12,000-Mile Warranty Auto-Registered
              </div>

              <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    void shareAdaptivity({
                      title: 'Adaptivity Performance',
                      text: `I just booked mobile auto service with Adaptivity Performance (${bookingRef}). Driveway service for Justin, Northlake & DFW.`,
                    });
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-orange-500/40 text-orange-300 font-bold text-xs hover:bg-orange-500/10"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share with a neighbor
                </button>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-slate-200 font-bold text-xs hover:border-amber-500/40 hover:text-amber-300"
                >
                  <Star className="w-3.5 h-3.5" />
                  Leave a review
                </a>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Done / Return to Website
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
