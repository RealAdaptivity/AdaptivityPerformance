import React, { useState, useEffect, useMemo } from 'react';
import { LOCAL_HUB } from '../site/localSeo';
import { X, Calendar, MapPin, Truck, ShieldCheck, Loader2, Share2, Star, UserPlus, Camera, Trash2, AlertTriangle } from 'lucide-react';
import { createBookingRequest } from '../services/bookingRequestApi';
import { computeServiceQuote } from '../services/servicePricing';
import { fetchApprovedPartners, type PartnerLocation } from '../services/partners';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../services/scheduleWindows';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';
import { applyReferralCodeOnBooking } from '../services/referrals';
import {
  EMPTY_VEHICLE,
  composeVehicleDescription,
  normalizeVin,
  validateVehicle,
  type VehicleDetails,
} from '../services/vehicleDetails';
import {
  MAX_MEDIA_FILES,
  MEDIA_ACCEPT_ATTR,
  describeMediaRejection,
  newMediaFolder,
  uploadBookingMedia,
} from '../services/bookingMediaApi';
import { signUpPortal } from '../portal/portalAuth';
import { portalPath } from '../portal/portalRoute';
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
    quotedAmountDollars: number;
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
  /* Was a single text box pre-filled with '2020 Ford F-150'. Marked required,
     but a pre-filled field is already satisfied, so anyone who skipped it
     booked a truck they did not own and a tech arrived with the wrong parts.
     Starts empty and is captured part by part now. */
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>(EMPTY_VEHICLE);
  const [vehicleErrors, setVehicleErrors] = useState<Partial<Record<keyof VehicleDetails, string>>>({});
  const [issueDescription, setIssueDescription] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [serviceRequested, setServiceRequested] = useState('Mobile Diagnostic Visit');
  const vehicle = composeVehicleDescription(vehicleDetails);
  const setVehicleField = (field: keyof VehicleDetails, value: string) => {
    setVehicleDetails((v) => ({ ...v, [field]: value }));
    setVehicleErrors((e) => ({ ...e, [field]: undefined }));
  };
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
  const [isCreatingHold, setIsCreatingHold] = useState(false);
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [partnerLocationId, setPartnerLocationId] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'idle' | 'created' | 'confirm_email'>('idle');

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerLocationId) || partners[0] || null,
    [partners, partnerLocationId]
  );

  const quotedQuote = useMemo(() => {
    const fromField = serviceRequested
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const fromInitial = initialEstimateData?.services || [];
    return computeServiceQuote(fromField.length ? fromField : fromInitial.length ? fromInitial : ['diagnostic']);
  }, [serviceRequested, initialEstimateData?.services]);
  const quotedPreview = quotedQuote.quotedDollars;

  useEffect(() => {
    if (initialEstimateData) {
      if (initialEstimateData.vehicle) {
        /* The estimate flow passes one string like '2021 Ford F-150'. Keep
           what maps cleanly and leave the rest for the customer. */
        const [maybeYear, maybeMake, ...rest] = initialEstimateData.vehicle.trim().split(/\s+/);
        setVehicleDetails((v) => ({
          ...v,
          year: /^\d{4}$/.test(maybeYear ?? '') ? maybeYear : v.year,
          make: /^\d{4}$/.test(maybeYear ?? '') ? (maybeMake ?? v.make) : (maybeYear ?? v.make),
          model: (/^\d{4}$/.test(maybeYear ?? '') ? rest.join(' ') : [maybeMake, ...rest].join(' ')) || v.model,
        }));
      }
      if (initialEstimateData.vin) setVehicleField('vin', initialEstimateData.vin);
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
        setReferralInput(initialEstimateData.referralCode.toUpperCase());
      }
    }
  }, [initialEstimateData]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSubmitError(null);
      setBookingRef('');
      setAccountPassword('');
      setAccountPasswordConfirm('');
      setAccountBusy(false);
      setAccountError(null);
      setAccountStatus('idle');
      setCity('');
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
      return formatServiceAddress({
        street: streetAddress,
        city,
        state: 'TX',
        zip: zipCode,
      });
    }
    return selectedPartner
      ? `${selectedPartner.businessName} • ${selectedPartner.address}`
      : 'Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247';
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
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

    setIsCreatingHold(true);

    try {
      const servicesList = serviceRequested
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      /* Attachments upload first so their paths can go on the booking row.
         A failed upload never fails the booking: the customer is told which
         file did not make it and the visit still gets scheduled. */
      let uploadedPaths: string[] = [];
      if (mediaFiles.length) {
        const outcome = await uploadBookingMedia(mediaFiles, newMediaFolder());
        uploadedPaths = outcome.paths;
        if (outcome.failures.length) {
          setMediaNotice(
            `Could not attach ${outcome.failures.map((f) => `${f.name} (${f.reason})`).join(', ')}. Your booking was still sent.`
          );
        }
      }

      const booking = await createBookingRequest({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        customerAddress: buildAddress(),
        zipCode:
          serviceMode === 'shop'
            ? selectedPartner?.zipCode || zipCode.trim() || '76247'
            : zipCode.trim() || '76247',
        vehicleDescription: vehicle.trim(),
        vehicleYear: vehicleDetails.year.trim(),
        vehicleMake: vehicleDetails.make.trim(),
        vehicleModel: vehicleDetails.model.trim(),
        vehicleTrim: vehicleDetails.trim.trim() || undefined,
        vehicleEngine: vehicleDetails.engine.trim() || undefined,
        issueDescription: issueDescription.trim(),
        mediaPaths: uploadedPaths.length ? uploadedPaths : undefined,
        vin: normalizeVin(vehicleDetails.vin) || undefined,
        services: servicesList.length ? servicesList : [serviceRequested.trim()],
        locationType: serviceMode,
        partnerLocationId:
          serviceMode === 'shop' ? selectedPartner?.id || partnerLocationId || undefined : undefined,
        preferredDate,
        preferredTimeWindow: preferredTime,
        customerNotes: notes.trim() || undefined,
        preferredMechanicId: initialEstimateData?.preferredMechanicId || undefined,
        ...applyReferralCodeOnBooking(referralInput),
      });

      setBookingRef(booking.bookingReference);
      onBookingSubmitted?.({
        bookingReference: booking.bookingReference,
        quotedAmountDollars: booking.quotedAmountDollars,
        name: fullName,
        phone,
        vehicle,
      });
      setStep(3);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit your booking request');
    } finally {
      setIsCreatingHold(false);
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
                Step {step} of 3 • Pay in person when the job is done
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-[#0b0c10] px-6 py-3 border-b border-white/5 flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Vehicle Info' },
            { num: 2, label: 'Driveway Location' },
            { num: 3, label: 'Confirmed' },
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
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                /* Native `required` cannot check a VIN's shape or a plausible
                   model year, and reporting one error at a time would make the
                   customer resubmit to find the next. */
                const found = validateVehicle(vehicleDetails);
                const byField: Partial<Record<keyof VehicleDetails, string>> = {};
                for (const err of found) byField[err.field] = err.message;
                setVehicleErrors(byField);
                const missingIssue = !issueDescription.trim();
                setIssueError(missingIssue ? 'Tell us what the vehicle is doing' : null);
                if (found.length || missingIssue) return;
                setStep(2);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Service Mode</label>
                <div className="p-3.5 rounded-2xl border border-orange-500/40 bg-orange-500/10 flex items-center justify-between text-xs font-bold text-white">
                  <div className="flex items-center space-x-2.5">
                    <Truck className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <div>100% Mobile Service — We Come To Your Driveway</div>
                      <div className="text-[10px] text-slate-400 font-normal">Justin · Northlake · Argyle · Denton · Keller · North Fort Worth</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    $0 Travel ({LOCAL_HUB.freeRadiusMiles} mi)
                  </span>
                </div>
              </div>

              {/* Vehicle, part by part. The tech orders parts off this, so a
                  trim and an engine are the difference between one visit and
                  two. */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">Your Vehicle</label>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="text" inputMode="numeric" required maxLength={4}
                      value={vehicleDetails.year}
                      onChange={e => setVehicleField('year', e.target.value.replace(/\D/g, ''))}
                      className={`w-full bg-[#0b0c10] border rounded-xl px-3 py-3 text-sm text-white focus:outline-none ${vehicleErrors.year ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                      placeholder="Year"
                      aria-label="Model year"
                    />
                    {vehicleErrors.year && <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.year}</p>}
                  </div>
                  <div>
                    <input
                      type="text" required
                      value={vehicleDetails.make}
                      onChange={e => setVehicleField('make', e.target.value)}
                      className={`w-full bg-[#0b0c10] border rounded-xl px-3 py-3 text-sm text-white focus:outline-none ${vehicleErrors.make ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                      placeholder="Make"
                      aria-label="Make"
                    />
                    {vehicleErrors.make && <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.make}</p>}
                  </div>
                  <div>
                    <input
                      type="text" required
                      value={vehicleDetails.model}
                      onChange={e => setVehicleField('model', e.target.value)}
                      className={`w-full bg-[#0b0c10] border rounded-xl px-3 py-3 text-sm text-white focus:outline-none ${vehicleErrors.model ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                      placeholder="Model"
                      aria-label="Model"
                    />
                    {vehicleErrors.model && <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.model}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text" required
                      value={vehicleDetails.trim}
                      onChange={e => setVehicleField('trim', e.target.value)}
                      className={`w-full bg-[#0b0c10] border rounded-xl px-3 py-3 text-sm text-white focus:outline-none ${vehicleErrors.trim ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                      placeholder="Trim (e.g. Lariat)"
                      aria-label="Trim"
                    />
                    {vehicleErrors.trim && <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.trim}</p>}
                  </div>
                  <div>
                    <input
                      type="text" required
                      value={vehicleDetails.engine}
                      onChange={e => setVehicleField('engine', e.target.value)}
                      className={`w-full bg-[#0b0c10] border rounded-xl px-3 py-3 text-sm text-white focus:outline-none ${vehicleErrors.engine ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                      placeholder="Engine (e.g. 3.5L V6)"
                      aria-label="Engine"
                    />
                    {vehicleErrors.engine && <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.engine}</p>}
                  </div>
                </div>

                <div>
                  <input
                    type="text" required maxLength={17}
                    value={vehicleDetails.vin}
                    onChange={e => setVehicleField('vin', e.target.value.toUpperCase())}
                    className={`w-full bg-[#0b0c10] border rounded-xl px-3.5 py-3 text-sm text-white font-mono tracking-wider focus:outline-none ${vehicleErrors.vin ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                    placeholder="VIN (17 characters)"
                    aria-label="VIN"
                  />
                  {vehicleErrors.vin
                    ? <p className="text-[10px] text-red-400 mt-1">{vehicleErrors.vin}</p>
                    : <p className="text-[10px] text-slate-500 mt-1">Driver-side door jamb, or the base of the windshield. Lets your tech bring the right parts the first time.</p>}
                </div>
              </div>

              {/* What is actually wrong. Previously there was nowhere to say
                  this before step 2's parking-notes box. */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">What is it doing?</label>
                <textarea
                  rows={3}
                  required
                  value={issueDescription}
                  onChange={e => { setIssueDescription(e.target.value); setIssueError(null); }}
                  className={`w-full bg-[#0b0c10] border rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none ${issueError ? 'border-red-500/70' : 'border-white/15 focus:border-orange-500'}`}
                  placeholder="e.g. Grinding from the front right when braking, started about a week ago and is worse when cold."
                />
                {issueError && <p className="text-[10px] text-red-400 mt-1">{issueError}</p>}
              </div>

              {/* Optional on purpose: a car that will not start is a bad moment
                  to ask someone to film it. */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Photos or video <span className="font-normal text-slate-500">— optional</span>
                </label>
                <label className="flex items-center gap-2.5 w-full cursor-pointer bg-[#0b0c10] border border-dashed border-white/20 hover:border-orange-500/50 rounded-xl px-3.5 py-3 text-xs text-slate-400 transition-colors">
                  <Camera className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Add up to {MAX_MEDIA_FILES} photos or short videos (50 MB each)</span>
                  <input
                    type="file"
                    multiple
                    accept={MEDIA_ACCEPT_ATTR}
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      const rejected = picked
                        .map((f) => ({ f, why: describeMediaRejection(f) }))
                        .filter((r) => r.why);
                      const ok = picked.filter((f) => !describeMediaRejection(f));
                      setMediaFiles((prev) => [...prev, ...ok].slice(0, MAX_MEDIA_FILES));
                      setMediaNotice(
                        rejected.length
                          ? `Skipped ${rejected.map((r) => `${r.f.name} (${r.why})`).join(', ')}.`
                          : null
                      );
                      e.target.value = '';
                    }}
                  />
                </label>

                {mediaFiles.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {mediaFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-[11px] text-slate-300 truncate">{f.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-500">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {mediaNotice && (
                  <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {mediaNotice}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Time Window</label>
                  <select
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
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

              {/* Nothing is taken online — payment happens at the vehicle. */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    No card needed to book
                  </span>
                  <span className="font-mono text-orange-400 font-bold">${quotedPreview.toFixed(2)} on site</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Nothing is charged online. Your technician takes payment in person when the work is done, and the
                  diagnostic is <strong>credited in full</strong> toward the repair.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                Continue: Address & Contact Info →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {serviceMode === 'mobile' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Street address (include street name)
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={e => setStreetAddress(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      placeholder="e.g. 1234 Canyon Falls Dr"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                        placeholder="Northlake"
                        autoComplete="address-level2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Zip</label>
                      <input
                        type="text"
                        required
                        value={zipCode}
                        onChange={e => setZipCode(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                        placeholder="76226"
                        autoComplete="postal-code"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Dispatch needs the full address — house number alone (e.g. 15637, 76177) is not enough.
                  </p>
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
                <p className="text-[10px] text-slate-500 leading-relaxed pl-6">
                  By providing your number, you consent to receive service-related text messages
                  (appointment updates, receipts, and secure payment links) from Adaptivity Performance.
                  Message &amp; data rates may apply. Reply STOP to opt out, HELP for help.
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/30 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 font-bold block">Pay in person when the job is done</strong>
                  <span>
                    No card is taken to book. You pay <strong className="text-white">${quotedPreview.toFixed(2)}</strong>
                    {quotedQuote.mode === 'diagnostic'
                      ? ' for the diagnostic visit — your tech sets repair pricing on site before any further work'
                      : ' when the job is completed'}
                    , paid directly to your technician by card, tap or chip at the vehicle.
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
                      Sending your request…
                    </>
                  ) : (
                    <>Request this visit →</>
                  )}
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
                <h3 className="font-heading text-2xl font-bold text-white mt-2">Booking request received</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                  <strong className="text-white">Nothing has been charged.</strong> Your technician takes
                  payment in person when the work is done — card, tap or chip. Dispatch will reach you at{' '}
                  <strong className="text-white">{phone}</strong> to confirm your technician and arrival window.
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
                {vehicleDetails.vin.trim() && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">VIN Number:</span>
                    <span className="font-bold font-mono text-orange-400">{normalizeVin(vehicleDetails.vin)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled:</span>
                  <span className="font-bold text-orange-400">{preferredDate} ({preferredTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Due in person:</span>
                  <span className="font-bold text-emerald-400">${quotedPreview.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 12-Month / 12,000-Mile Warranty Auto-Registered
              </div>

              {accountStatus === 'idle' && (
                <form
                  onSubmit={(e) => void handleCreateAccount(e)}
                  className="max-w-md mx-auto text-left bg-[#0b0c10] border border-orange-500/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <UserPlus className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">Save your info — create a free account</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Track this job, save your vehicle details, and book faster next time in the customer portal.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Name</span>
                      <span className="text-slate-200 font-medium truncate">{fullName || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Email</span>
                      <span className="text-slate-200 font-medium truncate">{email || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Phone</span>
                      <span className="text-slate-200 font-medium truncate">{phone || '—'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create password (8+ characters)"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                      required
                      minLength={8}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      value={accountPasswordConfirm}
                      onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                      required
                      minLength={8}
                    />
                  </div>
                  {accountError && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      {accountError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={accountBusy}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {accountBusy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      <>Create free account</>
                    )}
                  </button>
                </form>
              )}

              {accountStatus === 'created' && (
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-xs text-emerald-400 font-semibold">
                    Account created. Your booking is saved to your portal.
                  </p>
                  <a
                    href={portalPath()}
                    className="block w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs rounded-xl text-center"
                  >
                    Open customer portal
                  </a>
                </div>
              )}

              {accountStatus === 'confirm_email' && (
                <div className="max-w-md mx-auto space-y-2 text-left bg-[#0b0c10] border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-xs text-amber-300 font-semibold">
                    Account created. Confirm your email if required, then sign in at the customer portal — we&apos;ll
                    attach appointment #{bookingRef} automatically.
                  </p>
                  <a
                    href={portalPath()}
                    className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl text-center"
                  >
                    Go to customer portal
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    void shareAdaptivity({
                      title: 'Adaptivity Performance',
                      text: `I just booked mobile auto service with Adaptivity Performance (${bookingRef}). Driveway service for Justin, Northlake and ${LOCAL_HUB.radiusMiles} miles around.`,
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
