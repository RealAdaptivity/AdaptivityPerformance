import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Truck,
  ShieldCheck,
  Phone,
  UserPlus,
  Loader2,
  Car,
  AlertCircle,
  RotateCcw,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { useBookingContext } from '../context/BookingContext';
import { fetchApprovedPartners, type PartnerLocation } from '../services/partners';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../services/scheduleWindows';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { signUpPortal } from '../portal/portalAuth';
import {
  claimPendingGuestBooking,
  linkGuestBooking,
  stashPendingGuestBooking,
  updateProfilePhone,
} from '../services/linkGuestBooking';
import {
  extractZipFromAddress,
  formatServiceAddress,
  isIncompleteServiceAddress,
} from '../services/serviceAddress';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimateData?: {
    vehicle?: string;
    vin?: string;
    year?: string;
    make?: string;
    model?: string;
    licensePlate?: string;
    mileage?: string;
    symptoms?: string;
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
  const { addBooking } = useBookingContext();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceMode, setServiceMode] = useState<'mobile' | 'shop'>('mobile');

  // Individual vehicle fields
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [serviceRequested, setServiceRequested] = useState('Diagnostic & Inspection');
  const [preferredDate, setPreferredDate] = useState(todayISODate());
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [partnerLocationId, setPartnerLocationId] = useState<string>('');

  // Agreement & Signature state
  const [ackDiagnosticFee, setAckDiagnosticFee] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type');
  const [typedSignatureFont, setTypedSignatureFont] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const FONT_STYLES = useMemo(
    () => [
      { name: 'Dancing Script', label: 'Elegant Cursive', font: 'italic 34px "Dancing Script", "Brush Script MT", cursive', family: "'Dancing Script', cursive" },
      { name: 'Caveat', label: 'Modern Script', font: '600 36px "Caveat", "Segoe Script", cursive', family: "'Caveat', cursive" },
      { name: 'Great Vibes', label: 'Classic Calligraphy', font: '32px "Great Vibes", "Snell Roundhand", cursive', family: "'Great Vibes', cursive" },
    ],
    []
  );

  const drawTypedSignature = useCallback((name: string, fontIndex: number = typedSignatureFont) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const displayName = name.trim() || 'Signer Signature';
    const styleObj = FONT_STYLES[fontIndex] || FONT_STYLES[0];

    ctx.font = styleObj.font;
    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, canvas.width / 2, canvas.height / 2 - 4);

    // Decorative flourish line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(canvas.width * 0.12, canvas.height * 0.78);
    ctx.bezierCurveTo(
      canvas.width * 0.35, canvas.height * 0.9,
      canvas.width * 0.65, canvas.height * 0.68,
      canvas.width * 0.88, canvas.height * 0.82
    );
    ctx.stroke();

    if (name.trim()) {
      setHasSignature(true);
    }
  }, [FONT_STYLES, typedSignatureFont]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#12141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasSignature(false);

    if (signatureMode === 'type' && fullName.trim()) {
      drawTypedSignature(fullName, typedSignatureFont);
    }
  }, [signatureMode, fullName, typedSignatureFont, drawTypedSignature]);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        if (signatureMode === 'type' && fullName.trim()) {
          drawTypedSignature(fullName, typedSignatureFont);
        } else {
          initCanvas();
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [step, signatureMode, fullName, typedSignatureFont, drawTypedSignature, initCanvas]);

  const clearSignature = () => {
    initCanvas();
  };

  const adoptSignature = (fontIndex: number) => {
    setTypedSignatureFont(fontIndex);
    setSignatureMode('type');
    const nameToUse = fullName.trim() || 'Customer';
    drawTypedSignature(nameToUse, fontIndex);
  };

  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    isDrawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getCanvasPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
  };

  // Account creation state after booking
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'idle' | 'created' | 'confirm_email'>('idle');

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerLocationId) || partners[0] || null,
    [partners, partnerLocationId]
  );

  const fullVehicleName = useMemo(() => {
    return [vehicleYear.trim(), vehicleMake.trim(), vehicleModel.trim()]
      .filter(Boolean)
      .join(' ') || 'Customer Vehicle';
  }, [vehicleYear, vehicleMake, vehicleModel]);

  useEffect(() => {
    if (initialEstimateData) {
      if (initialEstimateData.year) setVehicleYear(initialEstimateData.year);
      if (initialEstimateData.make) setVehicleMake(initialEstimateData.make);
      if (initialEstimateData.model) setVehicleModel(initialEstimateData.model);

      if (initialEstimateData.vehicle) {
        const parts = initialEstimateData.vehicle.trim().split(/\s+/);
        if (parts.length >= 3 && /^\d{4}$/.test(parts[0])) {
          setVehicleYear(parts[0]);
          setVehicleMake(parts[1]);
          setVehicleModel(parts.slice(2).join(' '));
        } else if (parts.length === 2 && /^\d{4}$/.test(parts[0])) {
          setVehicleYear(parts[0]);
          setVehicleMake(parts[1]);
        } else {
          setVehicleModel(initialEstimateData.vehicle);
        }
      }

      if (initialEstimateData.vin) setVinNumber(initialEstimateData.vin);
      if (initialEstimateData.licensePlate) setLicensePlate(initialEstimateData.licensePlate);
      if (initialEstimateData.mileage) setMileage(initialEstimateData.mileage);
      if (initialEstimateData.symptoms) setSymptoms(initialEstimateData.symptoms);
      if (initialEstimateData.locationType) setServiceMode(initialEstimateData.locationType);
      if (initialEstimateData.serviceAddress) {
        setStreetAddress(initialEstimateData.serviceAddress);
        const z = extractZipFromAddress(initialEstimateData.serviceAddress);
        if (z) setZipCode(z);
      }
      if (initialEstimateData.services && initialEstimateData.services.length > 0) {
        setServiceRequested(initialEstimateData.services.join(', '));
      }
      if (initialEstimateData.partnerLocationId) {
        setPartnerLocationId(initialEstimateData.partnerLocationId);
        setServiceMode('shop');
      }
      if (initialEstimateData.referralCode) {
        setReferralInput(initialEstimateData.referralCode);
      }
    }
  }, [initialEstimateData]);

  // Load partners on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchApprovedPartners();
        if (!cancelled) {
          setPartners(list);
          if (list.length > 0 && !partnerLocationId) {
            setPartnerLocationId(list[0].id);
          }
        }
      } catch {
        // Partners offline fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerLocationId]);

  if (!isOpen) return null;

  const buildAddress = () => {
    if (serviceMode === 'mobile') {
      return formatServiceAddress({
        street: streetAddress,
        city: city || 'Justin',
        state: 'TX',
        zip: zipCode,
      });
    }
    return selectedPartner
      ? `${selectedPartner.businessName} • ${selectedPartner.address}`
      : 'Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247';
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!vehicleYear.trim() || !vehicleMake.trim() || !vehicleModel.trim()) {
      setSubmitError('Please enter your vehicle Year, Make, and Model.');
      return;
    }

    if (!mileage.trim()) {
      setSubmitError('Current vehicle mileage is required for service intervals and warranty.');
      return;
    }

    const cleanVin = vinNumber.trim().toUpperCase();
    if (!cleanVin) {
      setSubmitError('Vehicle VIN number is required for parts verification and dispatch.');
      return;
    }

    if (cleanVin.length < 11 || cleanVin.length > 17 || !/^[A-HJ-NPR-Z0-9]+$/i.test(cleanVin)) {
      setSubmitError('Please enter a valid VIN (17 alphanumeric characters, excluding letters I, O, Q).');
      return;
    }

    if (!symptoms.trim() && !serviceRequested.trim()) {
      setSubmitError('Please describe what is going on with your vehicle.');
      return;
    }

    setStep(2);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (serviceMode === 'mobile') {
      const assembled = buildAddress();
      if (isIncompleteServiceAddress(assembled) || isIncompleteServiceAddress(streetAddress)) {
        setSubmitError(
          'Enter a full street address with street name and city (not just a house number and zip). Example: 1234 Canyon Falls Dr, Northlake'
        );
        return;
      }
    }

    if (!phone.trim()) {
      setSubmitError('Phone number is required so dispatch can confirm your technician.');
      return;
    }

    if (!ackDiagnosticFee) {
      setSubmitError('Please check the required box confirming the $85 diagnostic fee and 12-hour waiver policy.');
      return;
    }

    if (!ackTerms) {
      setSubmitError('Please agree to the service authorization terms to proceed.');
      return;
    }

    if (!hasSignature) {
      setSubmitError('Please provide your digital signature in the authorization box to confirm your booking.');
      return;
    }

    setIsSubmitting(true);

    try {
      const servicesList = serviceRequested
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const combinedCustomerNotes = [
        symptoms.trim() ? `Issue/Symptoms: ${symptoms.trim()}` : '',
        mileage.trim() ? `Current Mileage: ${mileage.trim()}` : '',
        licensePlate.trim() ? `License Plate: ${licensePlate.trim().toUpperCase()}` : '',
        notes.trim() ? `Location/Access Notes: ${notes.trim()}` : '',
        `[Authorization Signed] $85 Diagnostic Fee acknowledged ($0 if approved within 12h). Signed by: ${fullName.trim()} on ${new Date().toLocaleDateString()}.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const resolvedRef = addBooking({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerAddress: buildAddress(),
        zipCode:
          serviceMode === 'shop'
            ? selectedPartner?.zipCode || zipCode.trim() || '76247'
            : zipCode.trim() || '76247',
        vehicle: fullVehicleName,
        vin: vinNumber.trim() ? vinNumber.trim().toUpperCase() : undefined,
        services: servicesList.length ? servicesList : [serviceRequested.trim()],
        totalEstimate: initialEstimateData?.totalEstimate || 85,
        locationType: serviceMode,
        distanceMiles: initialEstimateData?.calculatedDistanceMiles || 5,
        etaMinutes: 15,
        preferredDate,
        preferredTimeWindow: preferredTime,
        customerNotes: combinedCustomerNotes || undefined,
        preferredMechanicId: initialEstimateData?.preferredMechanicId || null,
      });

      setBookingRef(resolvedRef);
      stashPendingGuestBooking(resolvedRef);

      onBookingSubmitted?.({
        bookingReference: resolvedRef,
        holdAmountDollars: 0,
        name: fullName.trim(),
        phone: phone.trim(),
        vehicle: fullVehicleName,
      });

      setStep(3);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not complete booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    if (accountPassword.length < 8) {
      setAccountError('Password must be at least 8 characters.');
      return;
    }
    if (accountPassword !== accountPasswordConfirm) {
      setAccountError('Passwords do not match.');
      return;
    }
    setAccountBusy(true);
    try {
      const { data, error } = await signUpPortal('customer', email, accountPassword, fullName, {
        phone,
      });
      if (error) throw error;

      const userId = data.user?.id;
      const hasSession = Boolean(data.session?.access_token);

      if (bookingRef) {
        stashPendingGuestBooking(bookingRef);
      }

      if (hasSession && userId) {
        await updateProfilePhone(userId, phone);
        if (bookingRef) {
          try {
            await linkGuestBooking(bookingRef);
            await claimPendingGuestBooking();
          } catch (linkErr) {
            console.warn('[BookingModal] link guest booking', linkErr);
          }
        }
        setAccountStatus('created');
      } else {
        setAccountStatus('confirm_email');
      }
    } catch (err: unknown) {
      setAccountError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#12141c] w-full max-w-xl rounded-3xl border border-orange-500/40 shadow-2xl overflow-hidden relative text-white max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#181a26] to-[#0e1017] p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                Book Mobile Auto Repair • Adaptivity
              </h3>
              <p className="text-xs text-slate-400">
                {step === 3
                  ? 'Booking Confirmed • Zero Due Today'
                  : `Step ${step} of 2 • Zero payment required now`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (for Steps 1 & 2) */}
        {step < 3 && (
          <div className="bg-[#0b0c10] px-6 py-2.5 border-b border-white/5 flex items-center justify-between text-xs">
            {[
              { num: 1, label: 'Vehicle & Issue' },
              { num: 2, label: 'Location & Contact' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 font-bold ${
                  step === s.num
                    ? 'text-orange-400'
                    : step > s.num
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === s.num
                      ? 'bg-orange-500 text-white'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {s.num}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Zero Due Today
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Vehicle & Schedule Details */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Service Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Service Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceMode('mobile')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      serviceMode === 'mobile'
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-white/10 bg-[#0b0c10] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Truck className="w-4 h-4 text-orange-400" />
                      <span>Mobile Driveway</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">We come to your location ($0 travel 15 mi)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceMode('shop')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      serviceMode === 'shop'
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-white/10 bg-[#0b0c10] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <MapPin className="w-4 h-4 text-sky-400" />
                      <span>Shop Drop-off</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Justin Hub or Partner Garage</p>
                  </button>
                </div>
              </div>

              {/* Vehicle Details (Year, Make, Model, VIN) */}
              <div className="space-y-2.5 bg-[#0b0c10] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-orange-400" /> Vehicle Information
                  </span>
                  <span className="text-[10px] text-slate-400">Year · Make · Model</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Year <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="e.g. 2021"
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Make <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="Ford / Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Model <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="F-150 / Camry"
                    />
                  </div>
                </div>

                {/* Mileage (Required) & License Plate */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Current Mileage <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none font-medium"
                      placeholder="e.g. 52,000 mi"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      License Plate
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-sm text-white uppercase font-mono tracking-wide focus:border-orange-500 focus:outline-none"
                      placeholder="e.g. TX-ABC1234"
                    />
                  </div>
                </div>

                {/* Required VIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      VIN Number <span className="text-orange-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">17 characters (door jamb / insurance)</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={vinNumber}
                    onChange={(e) => setVinNumber(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, ''))}
                    className="w-full bg-[#12141c] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white tracking-wider focus:border-orange-500 focus:outline-none uppercase"
                    placeholder="17-character VIN (e.g. 1FTFW1ED4MF...)"
                    maxLength={17}
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Required for parts fitment accuracy and verified CARFAX repair history reporting.
                  </p>
                </div>
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
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-orange-500 focus:outline-none leading-relaxed"
                  placeholder="Describe what's happening (e.g. squeaking brakes when stopping, check engine light flashing, car cranks but won't start, leaking fluid on driveway, weird noise when turning)..."
                />
              </div>

              {/* Primary Service Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Service Category <span className="text-orange-400">*</span>
                </label>
                <select
                  value={
                    ['Diagnostic & Inspection', 'Part Install', 'Brakes & Rotors'].includes(serviceRequested)
                      ? serviceRequested
                      : 'Other / Custom Service'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other / Custom Service') {
                      setServiceRequested('Custom Repair');
                    } else {
                      setServiceRequested(val);
                    }
                  }}
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="Diagnostic & Inspection">Diagnostic &amp; Inspection</option>
                  <option value="Part Install">Part Install</option>
                  <option value="Brakes & Rotors">Brakes &amp; Rotors</option>
                  <option value="Other / Custom Service">Other / Custom Service</option>
                </select>

                {!['Diagnostic & Inspection', 'Part Install', 'Brakes & Rotors'].includes(serviceRequested) && (
                  <input
                    type="text"
                    value={serviceRequested}
                    onChange={(e) => setServiceRequested(e.target.value)}
                    className="w-full mt-2 bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Specify custom service request..."
                  />
                )}
              </div>

              {/* Date & Time Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    min={todayISODate()}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Time</label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  >
                    {PREFERRED_TIME_WINDOWS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Zero Due Today Reassurance */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-slate-900 border border-emerald-500/30 space-y-1 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Zero Payment Due Today
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Pay On Completion
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  No payment is charged today. Your certified technician inspects on-site,
                  agrees on labor + parts pricing with you, and payment is completed upon job verification.
                </p>
              </div>

              {submitError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </p>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Continue: Location &amp; Contact Info →</span>
              </button>
            </form>
          )}

          {/* STEP 2: Location & Contact Details */}
          {step === 2 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Summary Pill */}
              <div className="p-3 bg-[#0b0c10] border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Vehicle:</span>
                  <strong className="text-white">{fullVehicleName}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-orange-400 font-bold hover:underline"
                >
                  Edit Vehicle
                </button>
              </div>

              {serviceMode === 'mobile' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Street Address (include street name) <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="e.g. 1234 Canyon Falls Dr"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        City <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                        placeholder="Northlake / Justin / DFW"
                        autoComplete="address-level2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Zip Code <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                        placeholder="76226"
                        autoComplete="postal-code"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-white/10 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" /> Drop-off Location:
                  </div>
                  {selectedPartner ? (
                    <>
                      <p className="text-white font-semibold">{selectedPartner.businessName}</p>
                      <p>{selectedPartner.address}</p>
                    </>
                  ) : (
                    <p>Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Your Full Name <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFullName(val);
                      if (signatureMode === 'type') {
                        drawTypedSignature(val, typedSignatureFont);
                      }
                    }}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Phone Number <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    placeholder="(940) 304-0620"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address <span className="text-orange-400">*</span> (for appointment confirmation)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Access / Gate Code / Parking Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  placeholder="e.g. Gate code #1234, vehicle parked in front driveway, key will be available."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  placeholder="e.g. FRIEND10"
                  autoCapitalize="characters"
                />
              </div>

              {/* Diagnostic Fee & 12h Waiver Agreement */}
              <div className="bg-[#0b0c10] border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-slate-900/80 to-[#0b0c10] p-4 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                  <ShieldCheck className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>Diagnostic Fee &amp; 12-Hour Waiver Agreement</span>
                </div>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={ackDiagnosticFee}
                    onChange={(e) => setAckDiagnosticFee(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-900 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-200 leading-relaxed font-medium">
                    <strong className="text-white">I confirm that I will be charged an $85 diagnostic fee</strong>, and if I approve the recommended repair work within 12 hours, the <span className="text-emerald-400 font-bold">$85 diagnostic fee will be 100% waived</span> toward the repair total. <span className="text-orange-400 font-bold">*</span>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer pt-2 border-t border-white/10">
                  <input
                    type="checkbox"
                    required
                    checked={ackTerms}
                    onChange={(e) => setAckTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-900 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 leading-relaxed">
                    I agree to the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 font-bold hover:underline"
                    >
                      Adaptivity Terms of Service &amp; 12-Month Warranty
                    </a>
                    . I understand that <strong className="text-white">we are not responsible for customer-provided parts</strong>, and the <strong className="text-white">12-month warranty is only valid if Adaptivity Performance provides the parts</strong>. I authorize certified technicians to inspect, scan, and diagnose my vehicle on-site. <span className="text-orange-400 font-bold">*</span>
                  </span>
                </label>
              </div>

              {/* Digital Signature Pad (DocuSign Style + Draw) */}
              <div className="bg-[#0b0c10] border border-white/15 p-4 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <PenLine className="w-4 h-4 text-orange-400" />
                    <span>Customer Signature</span>
                    <span className="text-orange-400 font-bold">*</span>
                  </label>

                  {/* Mode Toggles */}
                  <div className="flex items-center gap-1.5 bg-[#12141c] p-1 rounded-xl border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSignatureMode('type');
                        const nameToUse = fullName.trim() || 'Customer';
                        drawTypedSignature(nameToUse, typedSignatureFont);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        signatureMode === 'type'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Adopt Name</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignatureMode('draw');
                        initCanvas();
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        signatureMode === 'draw'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <PenLine className="w-3 h-3" />
                      <span>Draw</span>
                    </button>
                  </div>
                </div>

                {/* DocuSign Font Style Choices (when in Adopt mode) */}
                {signatureMode === 'type' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Choose DocuSign Calligraphy Style:</span>
                      <span className="text-orange-400 font-medium">Auto-generated from Name</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {FONT_STYLES.map((st, idx) => (
                        <button
                          key={st.name}
                          type="button"
                          onClick={() => adoptSignature(idx)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            typedSignatureFont === idx
                              ? 'border-orange-500 bg-orange-500/15 shadow-sm ring-1 ring-orange-500'
                              : 'border-white/10 bg-[#12141c] hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <span
                            className="block text-base sm:text-lg text-orange-400 truncate leading-none py-1"
                            style={{ fontFamily: st.family }}
                          >
                            {fullName.trim() || 'Your Name'}
                          </span>
                          <span className="block text-[9px] text-slate-400 uppercase tracking-wider mt-1">
                            {st.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signature Canvas Box */}
                <div className="relative rounded-xl border border-white/15 bg-[#12141c] overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={110}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className={`w-full h-28 touch-none block ${
                      signatureMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  />
                  {!hasSignature && signatureMode === 'draw' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-500 text-xs font-medium italic select-none">
                      ✍️ Draw signature here with finger or mouse
                    </div>
                  )}
                  {signatureMode === 'type' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Adopted Signature</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <span>Signer: <strong className="text-slate-200">{fullName.trim() || 'Customer'}</strong></span>
                    {signatureMode === 'draw' && (
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-slate-400 hover:text-orange-400 flex items-center gap-1 transition px-1.5 py-0.5 rounded bg-white/5"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                  <span className="text-emerald-400 font-medium">E-SIGN Act Binding Authorization</span>
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </p>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming booking…</span>
                    </>
                  ) : (
                    <>Confirm Appointment (Zero Due) ✓</>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Booking Confirmed Screen */}
          {step === 3 && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-bold shadow-lg shadow-emerald-500/20">
                ✓
              </div>

              <div>
                <span className="text-xs bg-orange-500/10 text-orange-400 font-mono font-bold px-3 py-1 rounded-full border border-orange-500/30">
                  Confirmation #{bookingRef}
                </span>
                <h3 className="font-heading text-2xl font-bold text-white mt-2">
                  Appointment Booked &amp; Confirmed!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1.5 leading-relaxed">
                  <strong className="text-emerald-400 font-semibold">Zero payment was charged today.</strong>{' '}
                  Our live dispatch team will contact you at{' '}
                  <strong className="text-white">{phone}</strong> to confirm your technician assignment and arrival window.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/10 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Vehicle:</span>
                  <span className="font-semibold text-white">{fullVehicleName}</span>
                </div>
                {vinNumber && (
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">VIN:</span>
                    <span className="font-mono text-slate-300">{vinNumber}</span>
                  </div>
                )}
                {symptoms && (
                  <div className="border-b border-white/5 pb-2">
                    <span className="text-slate-500 block mb-0.5">Issue Description:</span>
                    <span className="text-slate-300 font-medium">{symptoms}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Preferred Date &amp; Time:</span>
                  <span className="font-semibold text-orange-400">
                    {preferredDate} ({preferredTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-emerald-400">Zero Due Today • Pay On Site</span>
                </div>
              </div>

              {/* Direct Dispatch Support Contact */}
              <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/10 flex items-center justify-between text-xs max-w-md mx-auto">
                <div className="flex items-center gap-2 text-left">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white">Need immediate service or changes?</div>
                    <div className="text-slate-400 text-[11px]">Dispatch line is open 8AM – 10PM Daily</div>
                  </div>
                </div>
                <a
                  href={SITE_PHONE_TEL}
                  className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg font-bold text-xs"
                >
                  {SITE_PHONE_DISPLAY}
                </a>
              </div>

              {/* Optional Portal Account Creation */}
              {accountStatus === 'idle' && (
                <form
                  onSubmit={handleCreateAccount}
                  className="bg-[#0b0c10] border border-orange-500/30 rounded-2xl p-4 text-left space-y-3 max-w-md mx-auto"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Save this booking to your portal</div>
                      <div className="text-[10px] text-slate-400">
                        Create a password to track inspection photos, quotes &amp; warranty history
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="password"
                      placeholder="Create password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                    />
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={accountPasswordConfirm}
                      onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                      className="bg-[#12141c] border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>

                  {accountError && <p className="text-[11px] text-rose-400">{accountError}</p>}

                  <button
                    type="submit"
                    disabled={accountBusy}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs rounded-xl border border-orange-500/30 transition disabled:opacity-50"
                  >
                    {accountBusy ? 'Creating account…' : 'Save Password & Link Booking →'}
                  </button>
                </form>
              )}

              {accountStatus === 'created' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-400 font-semibold max-w-md mx-auto">
                  ✓ Account created and linked to your garage profile!
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-md mx-auto py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Done / Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
