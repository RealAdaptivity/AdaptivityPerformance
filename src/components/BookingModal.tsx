import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Info,
  Search,
  Loader2,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { LOCAL_HUB } from '../site/localSeo';
import { createBookingRequest } from '../services/bookingRequestApi';
import { computeServiceQuote } from '../services/servicePricing';
import { fetchApprovedPartners, type PartnerLocation } from '../services/partners';
import { PREFERRED_TIME_WINDOWS, todayISODate } from '../services/scheduleWindows';
import { GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL, shareAdaptivity } from '../site/seo';
import { applyReferralCodeOnBooking } from '../services/referrals';
import {
  EMPTY_VEHICLE,
  composeVehicleDescription,
  isValidVin,
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
import { lookupServiceZip } from '../services/serviceArea';
import {
  BOOKABLE_SERVICE_CATALOG,
  TRAVEL_FEE_DOLLARS,
  WEATHER_FEE_NOTE,
  FIRST_RESPONDER_DISCOUNT_NOTE,
  getCatalogById,
  matchCatalogFromLabel,
} from '../services/serviceCatalog';
import {
  BOOKING_STEPS,
  COUNTED_STEPS,
  SERVICE_CHOICES,
  displayPhone,
  formatDayLong,
  splitTimeWindow,
  upcomingDays,
  validateContact,
  validateNeed,
  validateWhen,
  validateWhere,
  vinTail,
  visitCharges,
} from '../services/bookingFlow';
import { BrandLogo } from './BrandLogo';
import { lookupVin, type VinSummary } from '../services/vinLookup';

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
    /** From the homepage coverage check — already confirmed as covered. */
    zipCode?: string;
    /** The customer's own words from the homepage, so they don't type it twice. */
    issueDescription?: string;
  };
  onBookingSubmitted?: (result: {
    bookingReference: string;
    quotedAmountDollars: number;
    name: string;
    phone: string;
    vehicle: string;
  }) => void;
  /** An admin booking for a caller from the dispatch board. Same steps, but
   *  VIN, trim, engine and email are optional (a caller often can't say), the
   *  consent box records that the terms were read to them, and the
   *  confirmation tells the admin what to say instead of offering an account. */
  phoneBooking?: boolean;
}

/** Step indexes: 0–4 are the questions, 5 is the review, 6 is the confirmation. */
const REVIEW_STEP = BOOKING_STEPS.length - 1;
const DONE_STEP = BOOKING_STEPS.length;

type Errors = Record<string, string | undefined>;

/** A catalog id for whatever a prefill passed in (an id or a title), so the
 *  matching quick pick lights up. Anything unrecognised is kept as typed. */
function resolveServiceId(raw: string): string {
  return getCatalogById(raw)?.id ?? matchCatalogFromLabel(raw)?.id ?? raw;
}

function serviceTitle(idOrLabel: string): string {
  return getCatalogById(idOrLabel)?.title ?? idOrLabel;
}

const money = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;

const inputClass = (invalid: boolean) =>
  `w-full min-h-[52px] rounded-2xl border bg-[#12141c] px-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 ${
    invalid ? 'border-amber-400/70' : 'border-white/[0.12]'
  }`;
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-400';
const optionalTag = <span className="normal-case tracking-normal font-normal">(optional)</span>;

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="mt-1.5 text-[13px] text-amber-300">
      {message}
    </p>
  ) : null;

const choiceClass = (on: boolean) =>
  `rounded-2xl border transition-colors ${
    on
      ? 'border-brand bg-brand/15 text-white'
      : 'border-white/[0.12] bg-[#12141c] text-slate-200 hover:border-white/25'
  }`;

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialEstimateData,
  onBookingSubmitted,
  phoneBooking = false,
}) => {
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  /* Set when the customer taps Edit on the review screen, so Continue takes
     them straight back there instead of through every later step again. */
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [serviceMode, setServiceMode] = useState<'mobile' | 'shop'>('mobile');
  const [services, setServices] = useState<string[]>(['diagnostic']);
  const [issueDescription, setIssueDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  /* Captured part by part. The tech orders parts off this, so a trim and an
     engine are the difference between one visit and two. */
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails>(EMPTY_VEHICLE);
  const [preferredDate, setPreferredDate] = useState(todayISODate());
  const [preferredTime, setPreferredTime] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [showLaterDate, setShowLaterDate] = useState(false);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [agreed, setAgreed] = useState(false); // consent: never pre-checked
  const [bookingRef, setBookingRef] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [partnerLocationId, setPartnerLocationId] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'idle' | 'created' | 'confirm_email'>('idle');

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastDecodedVin = useRef('');
  const [vinLookup, setVinLookup] = useState<
    | { status: 'idle' | 'loading' }
    | { status: 'done'; summary: VinSummary }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [visibleArea, setVisibleArea] = useState<{ top: number; height: number } | null>(null);

  const vehicle = composeVehicleDescription(vehicleDetails);
  const days = useMemo(() => upcomingDays(new Date(), 7), []);
  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerLocationId) || partners[0] || null,
    [partners, partnerLocationId]
  );
  const quote = useMemo(() => computeServiceQuote(services.length ? services : ['diagnostic']), [services]);
  const charges = visitCharges(serviceMode, { diagnostic: quote.quotedDollars, travel: TRAVEL_FEE_DOLLARS });
  const coverage = serviceMode === 'mobile' && /^\d{5}$/.test(zipCode.trim()) ? lookupServiceZip(zipCode) : null;

  useEffect(() => {
    if (!initialEstimateData) return;
    if (initialEstimateData.vehicle) {
      /* The estimate flow passes one string like '2021 Ford F-150'. Keep
         what maps cleanly and leave the rest for the customer. */
      const [maybeYear, maybeMake, ...rest] = initialEstimateData.vehicle.trim().split(/\s+/);
      const hasYear = /^\d{4}$/.test(maybeYear ?? '');
      setVehicleDetails((v) => ({
        ...v,
        year: hasYear ? maybeYear : v.year,
        make: hasYear ? (maybeMake ?? v.make) : (maybeYear ?? v.make),
        model: (hasYear ? rest.join(' ') : [maybeMake, ...rest].join(' ')) || v.model,
      }));
    }
    if (initialEstimateData.vin) setVehicleDetails((v) => ({ ...v, vin: initialEstimateData.vin!.toUpperCase() }));
    if (initialEstimateData.zipCode) setZipCode(initialEstimateData.zipCode);
    if (initialEstimateData.issueDescription) setIssueDescription(initialEstimateData.issueDescription);
    if (initialEstimateData.locationType) setServiceMode(initialEstimateData.locationType);
    if (initialEstimateData.serviceAddress) {
      setStreetAddress(initialEstimateData.serviceAddress);
      const z = extractZipFromAddress(initialEstimateData.serviceAddress);
      if (z) setZipCode(z);
    }
    if (initialEstimateData.services && initialEstimateData.services.length > 0) {
      setServices(initialEstimateData.services.map(resolveServiceId));
    }
    if (initialEstimateData.partnerLocationId) {
      setPartnerLocationId(initialEstimateData.partnerLocationId);
      setServiceMode('shop');
    }
    if (initialEstimateData.referralCode) {
      setReferralInput(initialEstimateData.referralCode.toUpperCase());
      setShowReferral(true);
    }
  }, [initialEstimateData]);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setFurthestStep(0);
      setEditingFromReview(false);
      setErrors({});
      setSubmitError(null);
      setBookingRef('');
      setAgreed(false);
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

  /* A new screen starts at its top, and focus moves to its heading so a
     screen reader announces where the customer is. */
  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, isOpen]);

  /* On a phone the keyboard covers the bottom of the screen, and iOS Safari
     does not shrink 100dvh for it: on a step full of fields (the vehicle one)
     the rest of the form and Continue sat under the keyboard with nothing
     left to scroll, and a swipe scrolled the page behind instead. So while the
     dialog is open the page behind does not scroll, and the dialog is sized to
     the part of the screen that is actually visible (the visual viewport). */
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return;
      setVisibleArea({ top: Math.round(vv.offsetTop), height: Math.round(vv.height) });
      // Keep the field being typed in on screen once the dialog shrinks.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== headingRef.current && scrollRef.current?.contains(active)) {
        active.scrollIntoView({ block: 'nearest' });
      }
    };
    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      [html.style.overflow, document.body.style.overflow] = prev;
      setVisibleArea(null);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const clearError = (field: string) =>
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  const setVehicleField = (field: keyof VehicleDetails, value: string) => {
    setVehicleDetails((v) => ({ ...v, [field]: value }));
    clearError(field);
  };

  /* The VIN fills in year, make, model, trim and engine (NHTSA, through the
     decode-vin edge function). Decoded values replace what was typed, because
     the VIN is the more reliable of the two; the customer can still edit. */
  const decodeVin = async (raw: string) => {
    const vin = normalizeVin(raw);
    if (vin === lastDecodedVin.current) return;
    lastDecodedVin.current = vin;
    setVinLookup({ status: 'loading' });
    try {
      const s = await lookupVin(vin);
      if (lastDecodedVin.current !== vin) return;
      setVehicleDetails((v) => ({
        ...v,
        year: s.year || v.year,
        make: s.make || v.make,
        model: s.model || v.model,
        trim: s.trim || v.trim,
        engine: s.engine || v.engine,
      }));
      for (const f of ['year', 'make', 'model', 'trim', 'engine'] as const) clearError(f);
      setVinLookup({ status: 'done', summary: s });
    } catch (e) {
      if (lastDecodedVin.current !== vin) return;
      lastDecodedVin.current = '';
      setVinLookup({ status: 'error', message: e instanceof Error ? e.message : 'Could not look up that VIN.' });
    }
  };
  const onVinChange = (value: string) => {
    setVehicleField('vin', value.toUpperCase());
    const vin = normalizeVin(value);
    if (isValidVin(vin)) void decodeVin(vin);
    else if (vinLookup.status !== 'idle') {
      lastDecodedVin.current = '';
      setVinLookup({ status: 'idle' });
    }
  };
  const describedBy = (field: string) => (errors[field] ? `bk-${field}-err` : undefined);

  const goTo = (next: number) => {
    setErrors({});
    setSubmitError(null);
    setStep(next);
    setFurthestStep((f) => Math.max(f, next));
  };

  const editFromReview = (index: number) => {
    setEditingFromReview(true);
    goTo(index);
  };

  const buildAddress = () => {
    if (serviceMode === 'mobile') {
      return formatServiceAddress({ street: streetAddress, city, state: 'TX', zip: zipCode });
    }
    return selectedPartner
      ? `${selectedPartner.businessName} • ${selectedPartner.address}`
      : 'Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247';
  };

  /** Errors for the current screen, all at once so nobody resubmits to find the next. */
  const checkStep = (index: number): Errors => {
    switch (BOOKING_STEPS[index]?.id) {
      case 'need':
        return validateNeed({ issue: issueDescription });
      case 'vehicle': {
        const out: Errors = {};
        for (const err of validateVehicle(vehicleDetails, new Date(), { phoneBooking })) out[err.field] = err.message;
        return out;
      }
      case 'when':
        return validateWhen({ date: preferredDate, window: preferredTime }, todayISODate());
      case 'where': {
        if (serviceMode === 'shop') return {};
        const out: Errors = validateWhere({ street: streetAddress, city, zip: zipCode });
        if (!out.street && (isIncompleteServiceAddress(streetAddress) || isIncompleteServiceAddress(buildAddress()))) {
          out.street = 'Include the street name, not just the house number — e.g. 1234 Canyon Falls Dr.';
        }
        if (!out.zip && !lookupServiceZip(zipCode)) {
          out.zip = `We don’t reach ${zipCode.trim()} yet. Call ${SITE_PHONE_DISPLAY} and we’ll see what we can do.`;
        }
        return out;
      }
      case 'contact':
        return validateContact({ fullName, phone, email, agreed, emailOptional: phoneBooking });
      default:
        return {};
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitError(null);
    /* Every screen is checked again: an Edit from review can leave an earlier
       one half-filled. Jump to the first that is not done. */
    for (let i = 0; i < REVIEW_STEP; i++) {
      const found = checkStep(i);
      if (Object.values(found).some(Boolean)) {
        setEditingFromReview(true);
        setStep(i);
        setErrors(found);
        return;
      }
    }

    setSubmitting(true);
    try {
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
        customerEmail: email.trim() || undefined,
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
        services: services.length ? services : ['diagnostic'],
        locationType: serviceMode,
        partnerLocationId:
          serviceMode === 'shop' ? selectedPartner?.id || partnerLocationId || undefined : undefined,
        preferredDate,
        preferredTimeWindow: preferredTime,
        customerNotes: notes.trim() || undefined,
        preferredMechanicId: initialEstimateData?.preferredMechanicId || undefined,
        ...applyReferralCodeOnBooking(referralInput),
        ...(phoneBooking ? { phoneBooking: true } : {}),
      });

      setBookingRef(booking.bookingReference);
      onBookingSubmitted?.({
        bookingReference: booking.bookingReference,
        quotedAmountDollars: booking.quotedAmountDollars,
        name: fullName,
        phone,
        vehicle,
      });
      goTo(DONE_STEP);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not send your request');
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    if (step === REVIEW_STEP) {
      void handleSubmitRequest();
      return;
    }
    const found = checkStep(step);
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }
    if (editingFromReview) {
      setEditingFromReview(false);
      goTo(REVIEW_STEP);
    } else {
      goTo(step + 1);
    }
  };

  const back = () => {
    if (step > 0) goTo(step - 1);
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
      const { data, error } = await signUpPortal('customer', email, accountPassword, fullName, { phone });
      if (error) throw error;

      const userId = data.user?.id;
      const hasSession = Boolean(data.session?.access_token);

      if (bookingRef) stashPendingGuestBooking(bookingRef);

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

  const stepId = BOOKING_STEPS[step]?.id;
  const done = step === DONE_STEP;
  const stepTitle =
    stepId === 'where' && serviceMode === 'shop' ? 'Where to drop it off' : BOOKING_STEPS[step]?.title ?? '';
  const whenLabel = (() => {
    const day = formatDayLong(preferredDate) ?? preferredDate;
    const { name } = splitTimeWindow(preferredTime);
    return `${day} · ${name}`;
  })();
  const primaryService = services[0] ?? 'diagnostic';
  const serviceLabel = serviceTitle(primaryService) + (services.length > 1 ? ` + ${services.length - 1} more` : '');
  const quickPick = SERVICE_CHOICES.some((c) => c.id === primaryService) && services.length === 1;
  const laterDateActive = showLaterDate || !days.some((d) => d.iso === preferredDate);
  const whereLabel =
    serviceMode === 'shop'
      ? selectedPartner?.businessName ?? 'Adaptivity Performance Garage'
      : streetAddress.trim() && city.trim()
        ? `${streetAddress.trim()}, ${city.trim()} ${zipCode.trim()}`
        : '';

  const continueLabel =
    step === REVIEW_STEP
      ? phoneBooking
        ? 'Book this visit'
        : 'Request this visit'
      : editingFromReview
        ? 'Save and review'
        : stepId === 'contact'
          ? 'Review visit'
          : 'Continue';
  const footNote =
    step === 0
      ? `${money(charges.diagnostic)} diagnostic${charges.travel ? ` + ${money(charges.travel)} travel` : ''} · paid in person · no card needed`
      : step === REVIEW_STEP
        ? 'Nothing is charged today.'
        : null;

  const priceCard = (compact = false) => (
    <div className={`rounded-2xl border border-brand/35 bg-[#12141c] ${compact ? 'p-4' : 'p-5'} space-y-2.5`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-300">Diagnostic visit</span>
        <span className="font-heading text-lg font-bold">{money(charges.diagnostic)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-300">Travel</span>
        <span className="font-heading text-lg font-bold">
          {charges.travel ? money(charges.travel) : <span className="text-sm font-semibold text-slate-400">None — drop-off</span>}
        </span>
      </div>
      <div className="h-px bg-white/[0.08]" />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Due at the visit</span>
        <span className="font-heading text-lg font-bold">{money(charges.dueAtVisit)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Due today</span>
        <span className="font-heading text-xl font-bold text-brand-soft">$0</span>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-400">
        No card needed. Pay your tech in person when the job is done. Any repair is quoted before it starts; the
        diagnostic is its own charge and is not applied toward the repair.
        {charges.travel ? ` ${WEATHER_FEE_NOTE} Members pay no travel or weather fee.` : ''}
        {` ${FIRST_RESPONDER_DISCOUNT_NOTE}`}
      </p>
    </div>
  );

  return (
    /* Above the cookie banner (z-[9999]) and the chat bubble: both sit on the
       bottom edge, which on a phone is exactly where Continue is. */
    <div
      className="fixed inset-x-0 top-0 z-[10000] flex h-[100dvh] bg-black/85 md:items-center md:justify-center md:p-6 md:backdrop-blur-md"
      style={visibleArea ? { top: visibleArea.top, height: visibleArea.height } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-step-title"
    >
      <div className="relative flex h-full w-full overflow-hidden bg-[#0b0c10] text-white md:grid md:h-[min(780px,94vh)] md:max-w-[900px] md:grid-cols-[220px_minmax(0,1fr)] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl lg:max-w-[1120px] lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Step rail — tablets and up */}
        <aside className="hidden md:flex flex-col gap-7 border-r border-white/[0.06] bg-[#0e1016] p-6">
          <BrandLogo size={40} />
          <ol className="space-y-1" aria-label="Booking steps">
            {BOOKING_STEPS.map((s, i) => {
              const complete = done || i < step;
              const current = !done && i === step;
              const reachable = !done && i <= furthestStep && i !== step;
              const badge = complete ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
                  <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-[13px] font-bold ${
                    current ? 'bg-brand text-[#0b0c10]' : 'border border-zinc-700 text-zinc-400'
                  }`}
                >
                  {i < COUNTED_STEPS ? i + 1 : <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
              );
              const text = (
                <span className={current ? 'font-semibold text-white' : complete ? 'text-slate-300' : 'text-zinc-400'}>
                  {s.label}
                </span>
              );
              return (
                <li key={s.id}>
                  {reachable ? (
                    <button
                      type="button"
                      onClick={() => (step === REVIEW_STEP ? editFromReview(i) : goTo(i))}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 text-left text-[15px] hover:bg-white/[0.04]"
                    >
                      {badge}
                      {text}
                    </button>
                  ) : (
                    <div
                      className="flex min-h-[44px] items-center gap-3 px-2 text-[15px]"
                      aria-current={current ? 'step' : undefined}
                    >
                      {badge}
                      {text}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-auto text-[13px] leading-relaxed text-slate-400">
            Rather talk to someone?
            <br />
            <a href={SITE_PHONE_TEL} className="font-semibold text-brand-soft hover:text-white">
              {SITE_PHONE_DISPLAY}
            </a>
          </p>
        </aside>

        {/* The current screen */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-white/[0.06] px-3 pb-3 pt-2.5 md:border-0 md:px-10 md:pb-0 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              {!done && step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  aria-label="Back"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/5 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : (
                <span className="pl-2 md:hidden">
                  <BrandLogo size={34} />
                </span>
              )}
              <p className="text-[13px] font-semibold text-slate-400">
                {phoneBooking && (
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-brand-soft">
                    <Phone className="h-3 w-3" aria-hidden="true" /> Phone booking
                  </span>
                )}
                {done ? (phoneBooking ? 'Booked' : 'Request sent') : step === REVIEW_STEP ? 'Review' : `Step ${step + 1} of ${COUNTED_STEPS}`}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close booking"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {!done && (
              <div className="mt-2.5 grid grid-cols-5 gap-1.5 px-1 md:hidden" aria-hidden="true">
                {Array.from({ length: COUNTED_STEPS }, (_, i) => (
                  <div key={i} className={`h-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-zinc-800'}`} />
                ))}
              </div>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6 sm:px-8 md:px-10 md:pt-3">
            {!done && (
              <h2
                id="booking-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="font-heading text-[30px] font-bold leading-[1.1] tracking-[-0.02em] outline-none md:text-4xl"
              >
                {stepTitle}
              </h2>
            )}

            {stepId === 'need' && (
              <div className="mt-2 space-y-6">
                <p className="text-[15px] leading-relaxed text-slate-400">
                  Not sure what’s wrong? Pick “Diagnose a problem” — the tech finds it on site.
                </p>
                <div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Service">
                    {SERVICE_CHOICES.map((c) => {
                      const on = services.length === 1 && services[0] === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setServices([c.id])}
                          className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${choiceClass(on)}`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="bk-all-services" className="mt-4 block text-sm font-semibold text-brand-soft">
                    {quickPick ? 'Something else? See all services' : 'Selected service'}
                  </label>
                  <select
                    id="bk-all-services"
                    value={quickPick ? '' : primaryService}
                    onChange={(e) => e.target.value && setServices([e.target.value])}
                    className={`${inputClass(false)} mt-2`}
                  >
                    <option value="">Choose from all services…</option>
                    {BOOKABLE_SERVICE_CATALOG.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                    {!quickPick && !getCatalogById(primaryService) && (
                      <option value={primaryService}>{serviceLabel}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="bk-issue" className={labelClass}>
                    What’s it doing?
                  </label>
                  <textarea
                    id="bk-issue"
                    rows={4}
                    value={issueDescription}
                    onChange={(e) => {
                      setIssueDescription(e.target.value);
                      clearError('issue');
                    }}
                    aria-invalid={errors.issue ? true : undefined}
                    aria-describedby={describedBy('issue')}
                    className={`${inputClass(!!errors.issue)} py-3.5 leading-relaxed`}
                    placeholder="e.g. Grinding from the front right when braking, started about a week ago and is worse when cold."
                  />
                  <FieldError id="bk-issue-err" message={errors.issue} />
                </div>

                {/* Optional on purpose: a car that will not start is a bad moment
                    to ask someone to film it. */}
                <div>
                  <label className="flex min-h-[64px] cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-white/20 px-4 hover:border-brand/50">
                    <Camera className="h-6 w-6 shrink-0 text-brand-soft" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">Add photos or a video</span>
                      <span className="text-[13px] text-slate-400">
                        Optional · up to {MAX_MEDIA_FILES} files, 50 MB each · a sound clip helps a lot
                      </span>
                    </span>
                    <input
                      type="file"
                      multiple
                      accept={MEDIA_ACCEPT_ATTR}
                      className="sr-only"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        const rejected = picked
                          .map((f) => ({ f, why: describeMediaRejection(f) }))
                          .filter((r) => r.why);
                        const ok = picked.filter((f) => !describeMediaRejection(f));
                        setMediaFiles((prev) => [...prev, ...ok].slice(0, MAX_MEDIA_FILES));
                        setMediaNotice(
                          rejected.length ? `Skipped ${rejected.map((r) => `${r.f.name} (${r.why})`).join(', ')}.` : null
                        );
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {mediaFiles.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {mediaFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#12141c] py-1 pl-3.5 pr-1"
                        >
                          <span className="truncate text-[13px] text-slate-300">{f.name}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="text-xs text-slate-500">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                            <button
                              type="button"
                              aria-label={`Remove ${f.name}`}
                              onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {mediaNotice && (
                    <p className="mt-2 flex items-start gap-1.5 text-[13px] text-amber-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {mediaNotice}
                    </p>
                  )}
                </div>
              </div>
            )}

            {stepId === 'vehicle' && (
              <div className="mt-2 space-y-5">
                <p className="text-[15px] leading-relaxed text-slate-400">
                  So the tech brings the right parts and tools the first time.
                </p>
                <div>
                  <label htmlFor="bk-vin" className={labelClass}>
                    VIN · fills in the rest for you{phoneBooking && <> {optionalTag}</>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="bk-vin"
                      maxLength={20}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      value={vehicleDetails.vin}
                      onChange={(e) => onVinChange(e.target.value)}
                      aria-invalid={errors.vin ? true : undefined}
                      aria-describedby={errors.vin ? 'bk-vin-err' : 'bk-vin-help'}
                      className={`${inputClass(!!errors.vin)} min-w-0 flex-1 font-heading tracking-[0.08em]`}
                      placeholder="17 characters"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        lastDecodedVin.current = '';
                        void decodeVin(vehicleDetails.vin);
                      }}
                      disabled={!isValidVin(vehicleDetails.vin) || vinLookup.status === 'loading'}
                      className="inline-flex min-h-[52px] shrink-0 items-center gap-1.5 rounded-2xl border border-white/[0.14] px-4 text-sm font-semibold text-slate-200 hover:border-white/30 disabled:opacity-40"
                    >
                      {vinLookup.status === 'loading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Search className="h-4 w-4" aria-hidden="true" />
                      )}
                      Look up
                    </button>
                  </div>
                  <FieldError id="bk-vin-err" message={errors.vin} />
                  <div aria-live="polite">
                    {vinLookup.status === 'done' && (
                      <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-[13px] leading-relaxed text-emerald-100">
                        <p className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                          <span>
                            <strong>{vinLookup.summary.description}</strong>
                            {vinLookup.summary.trim ? ` · ${vinLookup.summary.trim}` : ''} — filled in below. Fix
                            anything that looks wrong.
                          </span>
                        </p>
                        {vinLookup.summary.warnings.map((w) => (
                          <p key={w} className="mt-1.5 pl-6 text-amber-200">{w}</p>
                        ))}
                      </div>
                    )}
                    {vinLookup.status === 'error' && (
                      <p className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-100">
                        {vinLookup.message} You can still fill the vehicle in below.
                      </p>
                    )}
                  </div>
                  <p
                    id="bk-vin-help"
                    className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-[#12141c] px-3.5 py-3 text-[13px] leading-relaxed text-slate-400"
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" aria-hidden="true" />
                    {phoneBooking
                      ? 'Ask the caller to read it off the bottom corner of the windshield on the driver’s side, the driver’s door jamb sticker, or their insurance card. It decodes as soon as all 17 characters are in.'
                      : 'Bottom corner of the windshield on the driver’s side, the sticker in the driver’s door jamb, or your insurance card.'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label htmlFor="bk-year" className={labelClass}>
                      Year
                    </label>
                    <input
                      id="bk-year"
                      inputMode="numeric"
                      maxLength={4}
                      value={vehicleDetails.year}
                      onChange={(e) => setVehicleField('year', e.target.value.replace(/\D/g, ''))}
                      aria-invalid={errors.year ? true : undefined}
                      aria-describedby={describedBy('year')}
                      className={inputClass(!!errors.year)}
                      placeholder="2016"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="bk-make" className={labelClass}>
                      Make
                    </label>
                    <input
                      id="bk-make"
                      value={vehicleDetails.make}
                      onChange={(e) => setVehicleField('make', e.target.value)}
                      aria-invalid={errors.make ? true : undefined}
                      aria-describedby={describedBy('make')}
                      className={inputClass(!!errors.make)}
                      placeholder="Ford"
                    />
                  </div>
                </div>
                {(errors.year || errors.make) && (
                  <div className="-mt-3">
                    <FieldError id="bk-year-err" message={errors.year} />
                    <FieldError id="bk-make-err" message={errors.make} />
                  </div>
                )}
                <div>
                  <label htmlFor="bk-model" className={labelClass}>
                    Model
                  </label>
                  <input
                    id="bk-model"
                    value={vehicleDetails.model}
                    onChange={(e) => setVehicleField('model', e.target.value)}
                    aria-invalid={errors.model ? true : undefined}
                    aria-describedby={describedBy('model')}
                    className={inputClass(!!errors.model)}
                    placeholder="F-150"
                  />
                  <FieldError id="bk-model-err" message={errors.model} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="bk-trim" className={labelClass}>
                      Trim{phoneBooking && <> {optionalTag}</>}
                    </label>
                    <input
                      id="bk-trim"
                      value={vehicleDetails.trim}
                      onChange={(e) => setVehicleField('trim', e.target.value)}
                      aria-invalid={errors.trim ? true : undefined}
                      aria-describedby={describedBy('trim')}
                      className={inputClass(!!errors.trim)}
                      placeholder="Lariat"
                    />
                    <FieldError id="bk-trim-err" message={errors.trim} />
                  </div>
                  <div>
                    <label htmlFor="bk-engine" className={labelClass}>
                      Engine{phoneBooking && <> {optionalTag}</>}
                    </label>
                    <input
                      id="bk-engine"
                      value={vehicleDetails.engine}
                      onChange={(e) => setVehicleField('engine', e.target.value)}
                      aria-invalid={errors.engine ? true : undefined}
                      aria-describedby={describedBy('engine')}
                      className={inputClass(!!errors.engine)}
                      placeholder="3.5L V6"
                    />
                    <FieldError id="bk-engine-err" message={errors.engine} />
                  </div>
                </div>

              </div>
            )}

            {stepId === 'when' && (
              <div className="mt-2 space-y-6">
                <p className="text-[15px] leading-relaxed text-slate-400">
                  Pick a day and a window. We text you to lock in the exact time.
                </p>
                <fieldset className="min-w-0">
                  <legend className={labelClass}>Day</legend>
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 md:grid-cols-7">
                    {days.map((d) => {
                      const on = !laterDateActive && preferredDate === d.iso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          aria-pressed={on}
                          aria-label={d.long}
                          onClick={() => {
                            setPreferredDate(d.iso);
                            setShowLaterDate(false);
                            clearError('date');
                          }}
                          className={`flex min-h-[76px] w-16 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-auto ${choiceClass(on)}`}
                        >
                          <span className={`text-xs font-semibold ${on ? 'text-brand-soft' : 'text-slate-400'}`}>
                            {d.short}
                          </span>
                          <span className="font-heading text-[22px] font-bold">{d.dayOfMonth}</span>
                        </button>
                      );
                    })}
                  </div>
                  {laterDateActive ? (
                    <div className="mt-3">
                      <label htmlFor="bk-date" className="sr-only">
                        Another date
                      </label>
                      <input
                        id="bk-date"
                        type="date"
                        min={todayISODate()}
                        value={preferredDate}
                        onChange={(e) => {
                          setPreferredDate(e.target.value);
                          clearError('date');
                        }}
                        aria-invalid={errors.date ? true : undefined}
                        aria-describedby={describedBy('date')}
                        className={inputClass(!!errors.date)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLaterDate(true)}
                      className="mt-2 min-h-[44px] text-sm font-semibold text-brand-soft hover:text-white"
                    >
                      Need a later date?
                    </button>
                  )}
                  <FieldError id="bk-date-err" message={errors.date} />
                </fieldset>
                <fieldset className="min-w-0">
                  <legend className={labelClass}>Time window</legend>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {PREFERRED_TIME_WINDOWS.map((w) => {
                      const on = preferredTime === w;
                      const { name, hours } = splitTimeWindow(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            setPreferredTime(w);
                            clearError('window');
                          }}
                          className={`flex min-h-[60px] items-center justify-between gap-3 px-[18px] text-left ${choiceClass(on)}`}
                        >
                          <span className="text-base font-semibold">{name}</span>
                          <span className={`text-sm font-medium ${on ? 'text-brand-soft' : 'text-slate-400'}`}>
                            {hours}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError id="bk-window-err" message={errors.window} />
                </fieldset>
              </div>
            )}

            {stepId === 'where' && serviceMode === 'mobile' && (
              <div className="mt-2 space-y-5">
                <p className="text-[15px] leading-relaxed text-slate-400">
                  Home, work, or wherever it’s parked. We come to you.
                </p>
                <div>
                  <label htmlFor="bk-street" className={labelClass}>
                    Street address
                  </label>
                  <input
                    id="bk-street"
                    autoComplete="street-address"
                    value={streetAddress}
                    onChange={(e) => {
                      setStreetAddress(e.target.value);
                      clearError('street');
                    }}
                    aria-invalid={errors.street ? true : undefined}
                    aria-describedby={describedBy('street')}
                    className={inputClass(!!errors.street)}
                    placeholder="1234 Canyon Falls Dr"
                  />
                  <FieldError id="bk-street-err" message={errors.street} />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label htmlFor="bk-city" className={labelClass}>
                      City
                    </label>
                    <input
                      id="bk-city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearError('city');
                      }}
                      aria-invalid={errors.city ? true : undefined}
                      aria-describedby={describedBy('city')}
                      className={inputClass(!!errors.city)}
                      placeholder="Northlake"
                    />
                  </div>
                  <div>
                    <label htmlFor="bk-zip" className={labelClass}>
                      ZIP
                    </label>
                    <input
                      id="bk-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value.replace(/\D/g, ''));
                        clearError('zip');
                      }}
                      aria-invalid={errors.zip ? true : undefined}
                      aria-describedby={describedBy('zip')}
                      className={inputClass(!!errors.zip)}
                      placeholder="76226"
                    />
                  </div>
                </div>
                {(errors.city || errors.zip) && (
                  <div className="-mt-3">
                    <FieldError id="bk-city-err" message={errors.city} />
                    <FieldError id="bk-zip-err" message={errors.zip} />
                  </div>
                )}
                {coverage && !errors.zip && (
                  <p
                    className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm leading-snug text-emerald-100"
                    aria-live="polite"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>
                      <strong>{coverage.city} is in our area.</strong> Flat {money(TRAVEL_FEE_DOLLARS)} travel fee, paid
                      at the visit.
                    </span>
                  </p>
                )}
                <div>
                  <label htmlFor="bk-notes" className={labelClass}>
                    Parking or gate notes {optionalTag}
                  </label>
                  <input
                    id="bk-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={inputClass(false)}
                    placeholder="Gate code, which driveway, where the key is"
                  />
                </div>
              </div>
            )}

            {stepId === 'where' && serviceMode === 'shop' && (
              <div className="mt-4 space-y-5">
                <div className="space-y-1 rounded-2xl border border-white/10 bg-[#12141c] p-5 text-sm text-slate-300">
                  <p className="flex items-center gap-1.5 font-semibold text-white">
                    <MapPin className="h-4 w-4 text-brand-soft" aria-hidden="true" /> Drop-off location
                  </p>
                  {selectedPartner ? (
                    <>
                      <p className="font-semibold text-white">{selectedPartner.businessName}</p>
                      <p>{selectedPartner.address}</p>
                      {selectedPartner.hoursNote && <p className="text-slate-400">{selectedPartner.hoursNote}</p>}
                    </>
                  ) : (
                    <p>Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247</p>
                  )}
                  <p className="pt-2 text-slate-400">You bring the car in, so travel doesn’t apply.</p>
                </div>
                <div>
                  <label htmlFor="bk-notes" className={labelClass}>
                    Notes for the shop {optionalTag}
                  </label>
                  <input
                    id="bk-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={inputClass(false)}
                    placeholder="Anything we should know at drop-off"
                  />
                </div>
              </div>
            )}

            {stepId === 'contact' && (
              <div className="mt-2 space-y-5">
                <p className="text-[15px] leading-relaxed text-slate-400">
                  {phoneBooking
                    ? 'The caller’s details. We text this number to confirm and when the tech is on the way.'
                    : 'We text when your tech is on the way.'}
                </p>
                <div>
                  <label htmlFor="bk-name" className={labelClass}>
                    Full name
                  </label>
                  <input
                    id="bk-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearError('fullName');
                    }}
                    aria-invalid={errors.fullName ? true : undefined}
                    aria-describedby={describedBy('fullName')}
                    className={inputClass(!!errors.fullName)}
                    placeholder="First and last"
                  />
                  <FieldError id="bk-fullName-err" message={errors.fullName} />
                </div>
                <div>
                  <label htmlFor="bk-phone" className={labelClass}>
                    Mobile phone
                  </label>
                  <input
                    id="bk-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError('phone');
                    }}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={describedBy('phone')}
                    className={inputClass(!!errors.phone)}
                    placeholder="(940) 555-0123"
                  />
                  <FieldError id="bk-phone-err" message={errors.phone} />
                </div>
                <div>
                  <label htmlFor="bk-email" className={labelClass}>
                    Email{phoneBooking && <> {optionalTag}</>}
                  </label>
                  <input
                    id="bk-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError('email');
                    }}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={describedBy('email')}
                    className={inputClass(!!errors.email)}
                    placeholder="For your confirmation and receipt"
                  />
                  <FieldError id="bk-email-err" message={errors.email} />
                </div>
                {showReferral ? (
                  <div>
                    <label htmlFor="bk-referral" className={labelClass}>
                      Referral code {optionalTag}
                    </label>
                    <input
                      id="bk-referral"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                      autoCapitalize="characters"
                      className={`${inputClass(false)} font-heading tracking-[0.06em]`}
                      placeholder="Friend’s code"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReferral(true)}
                    className="min-h-[44px] text-sm font-semibold text-brand-soft hover:text-white"
                  >
                    Have a referral code?
                  </button>
                )}
                <div>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-[#12141c] px-4 py-3.5 ${
                      errors.agreed ? 'border-amber-400/70' : 'border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        clearError('agreed');
                      }}
                      aria-invalid={errors.agreed ? true : undefined}
                      aria-describedby={describedBy('agreed')}
                      className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-brand"
                    />
                    {phoneBooking ? (
                      <span className="text-[13px] leading-relaxed text-slate-300">
                        I read the caller the{' '}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-soft hover:underline"
                        >
                          Terms of Service
                        </a>{' '}
                        summary (the {money(charges.diagnostic)} diagnostic is its own charge and is not applied toward
                        the repair{charges.travel ? `, ${money(charges.travel)} travel fee` : ''}, sales tax, the 12-month
                        warranty on parts we supply) and they agreed, including texts about this visit. They can reply
                        STOP to opt out.
                      </span>
                    ) : (
                    <span className="text-[13px] leading-relaxed text-slate-300">
                      I agree to the{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-soft hover:underline"
                      >
                        Terms of Service
                      </a>{' '}
                      (including the {money(charges.diagnostic)} diagnostic fee, 12-month warranty, 50-mile lug
                      re-torque duty, Mechanics’ Lien §70.001 and Denton County jurisdiction) and sign electronically
                      under the federal E-SIGN Act. I agree to get texts about this visit — appointment updates and
                      receipts. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
                    </span>
                    )}
                  </label>
                  <FieldError id="bk-agreed-err" message={errors.agreed} />
                </div>
              </div>
            )}

            {stepId === 'review' && (
              <div className="mt-4 space-y-6">
                <dl>
                  {[
                    {
                      label: 'Service',
                      value: serviceLabel,
                      sub: issueDescription.trim() + (mediaFiles.length ? ` · ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''}` : ''),
                      edit: 0,
                    },
                    { label: 'Vehicle', value: vehicle || '—', sub: vehicleDetails.vin ? `VIN ···· ${vinTail(vehicleDetails.vin)}` : '', edit: 1 },
                    { label: 'When', value: whenLabel, sub: splitTimeWindow(preferredTime).hours, edit: 2 },
                    { label: serviceMode === 'shop' ? 'Drop-off' : 'Where', value: whereLabel || '—', sub: notes.trim(), edit: 3 },
                    { label: 'You', value: fullName.trim() || '—', sub: [displayPhone(phone), email.trim()].filter(Boolean).join(' · '), edit: 4 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-3 border-b border-white/[0.08] py-3.5">
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">{row.label}</dt>
                        <dd className="mt-1 text-base font-semibold">{row.value}</dd>
                        {row.sub && <dd className="mt-0.5 line-clamp-2 text-sm text-slate-400">{row.sub}</dd>}
                      </div>
                      <button
                        type="button"
                        onClick={() => editFromReview(row.edit)}
                        className="min-h-[44px] shrink-0 px-1 text-sm font-semibold text-brand-soft hover:text-white"
                        aria-label={`Edit ${row.label.toLowerCase()}`}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>
                <div className="lg:hidden">
                  {priceCard()}
                </div>
                {submitError && (
                  <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                  </p>
                )}
              </div>
            )}

            {done && (
              <div className="space-y-6 pt-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand/15">
                  <Check className="h-8 w-8 text-brand" strokeWidth={2.6} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-soft">
                    Confirmation #{bookingRef}
                  </p>
                  <h2
                    id="booking-step-title"
                    ref={headingRef}
                    tabIndex={-1}
                    className="mt-2 font-heading text-[32px] font-bold leading-[1.1] outline-none"
                  >
                    {phoneBooking ? 'On the board.' : 'You’re on the board.'}
                  </h2>
                  <p className="mt-2.5 text-[15px] text-slate-400">
                    {whenLabel} · {vehicle}
                  </p>
                </div>
                {phoneBooking ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-brand/30 bg-[#12141c] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-soft">Tell the caller</p>
                      <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-200">
                        <li>
                          “Your confirmation number is <strong>{bookingRef}</strong>.”
                        </li>
                        <li>
                          “We’ll text {displayPhone(phone)} to confirm your arrival time, and your tech texts when
                          they’re on the way.”
                        </li>
                        <li>
                          “Nothing is charged today. You pay the tech in person — {money(charges.dueAtVisit)} for the
                          visit, plus sales tax. Any repair is priced before it starts.”
                        </li>
                      </ul>
                    </div>
                    {mediaNotice && (
                      <p className="flex items-start gap-1.5 text-[13px] text-amber-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {mediaNotice}
                      </p>
                    )}
                    <p className="text-[13px] text-slate-400">
                      It’s on the dispatch board now as a phone booking under your name. Assign a tech from there.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[52px] w-full rounded-2xl bg-brand font-heading text-base font-bold text-[#0b0c10] hover:bg-brand-soft"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                <>
                <ol className="space-y-1">
                  {[
                    <>
                      <strong>We text {displayPhone(phone)} to confirm</strong> your exact arrival time.
                    </>,
                    <>
                      <strong>Your tech texts</strong> when they’re on the way.
                    </>,
                    <>
                      <strong>Pay in person</strong> when the job is done — {money(charges.dueAtVisit)} for the visit.
                      Nothing has been charged.
                    </>,
                  ].map((body, i) => (
                    <li key={i} className="flex gap-3.5 py-2.5 text-[15px] leading-relaxed">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold ${
                          i === 0 ? 'bg-brand text-[#0b0c10]' : 'bg-zinc-800 text-white'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span>{body}</span>
                    </li>
                  ))}
                </ol>
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Repairs carry our 12-month / 12,000-mile
                  warranty, registered automatically.
                </p>
                {mediaNotice && (
                  <p className="flex items-start gap-1.5 text-[13px] text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {mediaNotice}
                  </p>
                )}

                {/* A request is not a confirmed slot, and dispatch may be out on
                    a job. tel: so it dials straight from the phone they booked on. */}
                <a
                  href={SITE_PHONE_TEL}
                  className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/[0.14] text-[15px] font-semibold hover:border-brand/50"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> Need it sooner? Call {SITE_PHONE_DISPLAY}
                </a>

                {accountStatus === 'idle' && (
                  <form
                    onSubmit={(e) => void handleCreateAccount(e)}
                    className="space-y-3 rounded-2xl border border-brand/30 bg-[#12141c] p-5"
                  >
                    <div className="flex items-start gap-2.5">
                      <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-brand-soft" aria-hidden="true" />
                      <div>
                        <p className="text-base font-semibold">Create an account to track it</p>
                        <p className="mt-0.5 text-[13px] text-slate-400">
                          Follow this job, keep your vehicle on file, and book faster next time. Uses {email}.
                        </p>
                      </div>
                    </div>
                    <label htmlFor="bk-pass" className="sr-only">
                      Create password
                    </label>
                    <input
                      id="bk-pass"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create password (8+ characters)"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className={inputClass(false)}
                      required
                      minLength={8}
                    />
                    <label htmlFor="bk-pass2" className="sr-only">
                      Confirm password
                    </label>
                    <input
                      id="bk-pass2"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      value={accountPasswordConfirm}
                      onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                      className={inputClass(false)}
                      required
                      minLength={8}
                    />
                    {accountError && (
                      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {accountError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={accountBusy}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand font-heading text-base font-bold text-[#0b0c10] hover:bg-brand-soft disabled:opacity-60"
                    >
                      {accountBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creating account…
                        </>
                      ) : (
                        'Create free account'
                      )}
                    </button>
                  </form>
                )}
                {accountStatus === 'created' && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-300">Account created. This visit is in your portal.</p>
                    <a
                      href={portalPath()}
                      className="flex min-h-[52px] items-center justify-center rounded-2xl bg-brand font-heading font-bold text-[#0b0c10]"
                    >
                      Open customer portal
                    </a>
                  </div>
                )}
                {accountStatus === 'confirm_email' && (
                  <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-[#12141c] p-4">
                    <p className="text-sm text-amber-200">
                      Account created. Confirm your email if asked, then sign in at the customer portal — we’ll attach
                      #{bookingRef} automatically.
                    </p>
                    <a
                      href={portalPath()}
                      className="flex min-h-[48px] items-center justify-center rounded-xl bg-zinc-800 font-semibold hover:bg-zinc-700"
                    >
                      Go to customer portal
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      void shareAdaptivity({
                        title: 'Adaptivity Performance',
                        text: `I just booked mobile auto service with Adaptivity Performance (${bookingRef}). Driveway service for Justin, Northlake and ${LOCAL_HUB.radiusMiles} miles around.`,
                      });
                    }}
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.14] text-sm font-semibold hover:border-brand/50"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" /> Share with a neighbor
                  </button>
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.14] text-sm font-semibold hover:border-brand/50"
                  >
                    <Star className="h-4 w-4" aria-hidden="true" /> Leave a review
                  </a>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] w-full rounded-xl bg-zinc-800 text-sm font-semibold hover:bg-zinc-700"
                >
                  Done
                </button>
                </>
                )}
              </div>
            )}
          </div>

          {!done && (
            <div className="border-t border-white/[0.06] bg-[#0b0c10] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 md:border-0 md:px-10 md:pb-8">
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="hidden min-h-[52px] rounded-2xl border border-white/[0.14] px-6 text-[15px] font-semibold hover:border-white/30 md:block"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={advance}
                  disabled={submitting}
                  className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand font-heading text-[17px] font-bold text-[#0b0c10] hover:bg-brand-soft disabled:opacity-60 md:max-w-xs md:flex-none md:px-10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {phoneBooking ? 'Booking…' : 'Sending your request…'}
                    </>
                  ) : (
                    continueLabel
                  )}
                </button>
              </div>
              {footNote && <p className="mt-2 text-center text-xs text-slate-400 md:text-left">{footNote}</p>}
            </div>
          )}
        </div>

        {/* Live summary — desktop */}
        <aside className="hidden lg:flex flex-col gap-5 border-l border-white/[0.06] bg-[#0e1016] px-6 pb-7 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Your visit</p>
          <dl className="space-y-4">
            {[
              { label: 'Service', value: serviceLabel, sub: issueDescription.trim(), reached: true },
              { label: 'Vehicle', value: vehicle, reached: furthestStep >= 1 },
              { label: 'When', value: whenLabel, reached: furthestStep >= 2 },
              { label: serviceMode === 'shop' ? 'Drop-off' : 'Where', value: whereLabel, reached: furthestStep >= 3 },
            ].map((row) => (
              <div key={row.label}>
                <dt className={`text-[13px] ${row.reached && row.value ? 'text-slate-400' : 'text-zinc-500'}`}>{row.label}</dt>
                <dd className={`mt-0.5 text-[15px] ${row.reached && row.value ? 'font-semibold' : 'text-zinc-500'}`}>
                  {row.reached && row.value ? row.value : 'Not yet'}
                </dd>
                {row.sub && <dd className="mt-0.5 line-clamp-2 text-[13px] text-slate-400">{row.sub}</dd>}
              </div>
            ))}
          </dl>
          <div className="mt-auto">
            {priceCard(true)}
          </div>
        </aside>
      </div>
    </div>
  );
};
