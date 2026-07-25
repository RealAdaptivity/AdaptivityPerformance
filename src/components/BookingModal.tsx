import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Truck, Home, ShieldCheck } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimateData?: any;
  onBookingSubmitted?: (bookingData: any) => string;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, initialEstimateData, onBookingSubmitted }) => {
  const [step, setStep] = useState(1);
  const [serviceMode, setServiceMode] = useState<'mobile' | 'shop'>('mobile');
  const [vehicle, setVehicle] = useState('2020 Ford F-150');
  const [vinNumber, setVinNumber] = useState('');
  const [serviceRequested, setServiceRequested] = useState('Front Brake Replacement & Rotor Resurface');
  const [preferredDate, setPreferredDate] = useState('2026-07-22');
  const [preferredTime, setPreferredTime] = useState('Morning (8 AM - 12 PM)');
  const [streetAddress, setStreetAddress] = useState('1234 Canyon Falls Dr');
  const [zipCode, setZipCode] = useState('76226');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  useEffect(() => {
    if (initialEstimateData) {
      if (initialEstimateData.vehicle) setVehicle(initialEstimateData.vehicle);
      if (initialEstimateData.vin) setVinNumber(initialEstimateData.vin);
      if (initialEstimateData.locationType) setServiceMode(initialEstimateData.locationType);
      if (initialEstimateData.serviceAddress) setStreetAddress(initialEstimateData.serviceAddress);
      if (initialEstimateData.services && initialEstimateData.services.length > 0) {
        setServiceRequested(initialEstimateData.services.join(', '));
      }
    }
  }, [initialEstimateData]);

  if (!isOpen) return null;

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    let generatedRef = 'AP-' + Math.floor(1000 + Math.random() * 9000);

    if (onBookingSubmitted) {
      const returnedId = onBookingSubmitted({
        name: fullName,
        phone: phone,
        address: streetAddress,
        zip: zipCode,
        vehicle: vehicle,
        vin: vinNumber,
        services: [serviceRequested],
        totalEstimate: initialEstimateData?.totalEstimate || 280,
        locationType: serviceMode,
        distanceMiles: initialEstimateData?.calculatedDistanceMiles || 5.2,
      });
      if (returnedId) generatedRef = returnedId;
    }

    setBookingRef(generatedRef);
    setStep(3); // Confirmation step
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#12141c] w-full max-w-xl rounded-3xl border border-orange-500/40 shadow-2xl overflow-hidden relative text-white">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#181a26] to-[#0e1017] p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">Schedule Service • Adaptivity Performance</h3>
              <p className="text-xs text-slate-400">Justin & Northlake Local Mobile/Shop Dispatch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
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
                    <span>Drop Off at Justin Shop</span>
                  </button>
                </div>
              </div>

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
                    <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                    <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                    <option value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</option>
                    <option value="Emergency ASAP">Emergency Roadside ASAP</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all"
              >
                Next: Location & Contact Details →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">Zip Code (Justin/Northlake/Argyle/Haslet)</label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={e => setZipCode(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="76247 or 76226"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" /> Shop Base Address:
                  </div>
                  <p>Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
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
                    placeholder="(214) 620-3244"
                  />
                </div>
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

              <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/30 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 font-bold block">12-Month / 12k Warranty Guarantee</strong>
                  <span>Payments are processed through Adaptivity Platform Escrow upon job completion. Direct side payments (Zelle, Cash, Venmo) to techs are strictly prohibited and void warranty.</span>
                </div>
              </div>

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
                  className="w-2/3 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                >
                  Confirm & Request Service
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <div>
                <span className="text-xs bg-orange-500/10 text-orange-400 font-mono font-bold px-3 py-1 rounded-full border border-orange-500/30">
                  Confirmation #{bookingRef}
                </span>
                <h3 className="font-heading text-2xl font-bold text-white mt-2">Service Request Received!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                  Our dispatch coordinator will text and call <strong className="text-white">{phone || '(214) 620-3244'}</strong> within 15 minutes to confirm technician assignment for {vehicle}.
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
              </div>

              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 12-Month / 12,000-Mile Warranty Auto-Registered
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
