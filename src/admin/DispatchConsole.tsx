import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Truck,
  User,
  Wrench,
  Receipt,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';
import {
  googleMapsSearchUrl,
} from '../config/mapLinks';
import { DispatchMap } from './DispatchMap';
import type { Booking, JobStatus } from '../context/BookingContext';
import { isIncompleteServiceAddress } from '../services/serviceAddress';
import {
  adminCancelBookingHold,
  adminPatchBooking,
  fetchAdminBookings,
  fetchDispatchTechs,
  subscribeAdminBookings,
  type DispatchTech,
} from '../services/adminApi';
import { recordInPersonPayment } from '../services/techDispatch';
import { sendChargeReceiptSmsAuto } from '../services/sendSms';
import { FORM_1099_NEC_NOTICE } from '../content/taxForms';
import { DIAGNOSTIC_FEE_DOLLARS, techCanClaimServices } from '../services/serviceCatalog';
import {
  CANCEL_REASON_PRESETS,
} from '../services/adminAnalytics';
import {
  autoAssignNearestSpecialtyMatch,
  SLA_UNCLAIMED_ALERT_MINUTES,
  unclaimedAgeMinutes,
} from '../services/adminOpsExtras';
import {
  groupBookingsForBoard,
  resolveActiveColumn,
  techBoardStates,
  LIVE_COLUMN_IDS,
  type BoardColumnId,
  type BoardGroup,
  type TechBoardState,
} from '../services/dispatchBoard';
import { SERVICE_RADIUS_MILES, lookupServiceZip } from '../services/serviceArea';
import { formatPreferredSchedule } from '../services/scheduleWindows';

type TabId = 'dispatch' | 'map' | 'techs';

const STATUS_OPTIONS: JobStatus[] = ['UNASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELED'];

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function getAssignedTechName(b: Booking, techs: DispatchTech[]): string {
  if (b.claimedBy?.id) {
    const found = techs.find((t) => t.id === b.claimedBy?.id);
    if (found?.name) return found.name;
  }
  if (b.claimedBy?.name && b.claimedBy.name !== 'Technician') {
    return b.claimedBy.name;
  }
  return b.claimedBy ? b.claimedBy.name : 'Unassigned';
}

export const DispatchConsole: React.FC = () => {
  const [tab, setTab] = useState<TabId>('dispatch');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [techs, setTechs] = useState<DispatchTech[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* Which column the phone shows. The desktop board shows them all at once,
     so this only drives the narrow layout. */
  const [activeColumn, setActiveColumn] = useState<BoardColumnId>('needs_tech');
  const [showCanceled, setShowCanceled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, t] = await Promise.all([
        fetchAdminBookings(),
        fetchDispatchTechs(),
      ]);
      setBookings(b);
      setTechs(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = subscribeAdminBookings(() => {
      void load();
    });
    return () => {
      channel.unsubscribe();
    };
  }, [load]);

  const { groups, unplaced } = useMemo(
    () =>
      groupBookingsForBoard(bookings, {
        columns: showCanceled ? [...LIVE_COLUMN_IDS, 'canceled'] : LIVE_COLUMN_IDS,
      }),
    [bookings, showCanceled]
  );

  const techStates = useMemo(() => techBoardStates(techs, bookings), [techs, bookings]);

  const canceledCount = useMemo(
    () => bookings.filter((b) => b.status === 'CANCELED').length,
    [bookings]
  );

  /* A job whose status has no column at all. Cancelled jobs are hidden on
     purpose and do not count here; anything else means a job is on nobody's
     screen, which is worth saying out loud. */
  const unknownStatusCount = unplaced.filter((b) => b.status !== 'CANCELED').length;

  /* The chosen column can stop existing — switching canceled back off while it
     is the one on screen would otherwise leave the phone with every column
     hidden and nothing to look at. */
  const activeColumnId = resolveActiveColumn(groups, activeColumn);

  const slaBreaches = useMemo(
    () =>
      bookings.filter((b) => {
        const age = unclaimedAgeMinutes(b);
        return age != null && age >= SLA_UNCLAIMED_ALERT_MINUTES;
      }).length,
    [bookings]
  );

  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  const handlePatch = async (
    referenceCode: string,
    patch: Parameters<typeof adminPatchBooking>[1]
  ) => {
    setSaving(true);
    setActionError(null);
    try {
      /* CANCELED used to be rerouted through adminCancelBookingHold with
         releaseJob=true, which writes status 'UNASSIGNED' — so picking Cancel
         un-assigned the job and it reappeared on the board instead of being
         cancelled. That detour existed to release a Stripe card authorization;
         no card
         is taken any more, and adminPatchBooking already writes the status and
         the cancel reason in one update. */
      await adminPatchBooking(referenceCode, patch);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseToPool = async (referenceCode: string, cancelReason?: string) => {
    if (
      !window.confirm(
        'Release this job back to the open pool?'
      )
    ) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await adminCancelBookingHold(referenceCode, true, cancelReason);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Release failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dispatch', label: 'Dispatch board' },
    { id: 'map', label: 'Map' },
    { id: 'techs', label: 'Technicians' },
  ];

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 p-1 bg-[#12141c] border border-white/10 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                tab === t.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {tab === 'dispatch' && (
        <div className="flex flex-col gap-4 flex-1 min-h-[480px]">
          <TechStrip states={techStates} />

          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
            <section className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Narrow screens get one column at a time: four columns do not
                  fit side by side on a phone, and a squeezed card is unreadable. */}
              <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
                {groups.map((g) => (
                  <button
                    key={g.column.id}
                    type="button"
                    onClick={() => setActiveColumn(g.column.id)}
                    aria-pressed={activeColumnId === g.column.id}
                    className={`shrink-0 min-h-[44px] px-4 rounded-full text-xs font-bold border transition-colors ${
                      activeColumnId === g.column.id
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-[#12141c] text-slate-300 border-white/10'
                    }`}
                  >
                    {g.column.shortLabel} · {g.total}
                  </button>
                ))}
              </div>

              {loading && bookings.length === 0 ? (
                <div className="flex justify-center py-16 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex gap-3">
                  {groups.map((g) => (
                    <BoardColumnView
                      key={g.column.id}
                      group={g}
                      techs={techs}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      hiddenOnNarrow={g.column.id !== activeColumnId}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span>{bookings.length} jobs in total</span>
                {slaBreaches > 0 && (
                  <span className="font-bold text-amber-300">
                    {slaBreaches} waiting over {SLA_UNCLAIMED_ALERT_MINUTES}m
                  </span>
                )}
                {canceledCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCanceled((v) => !v)}
                    aria-pressed={showCanceled}
                    className="min-h-[44px] px-3 -my-2 font-semibold text-slate-400 hover:text-white underline underline-offset-2"
                  >
                    {showCanceled ? 'Hide' : 'Show'} canceled ({canceledCount})
                  </button>
                )}
                {unknownStatusCount > 0 && (
                  <span className="font-bold text-amber-300">
                    {unknownStatusCount} job{unknownStatusCount === 1 ? '' : 's'} with an
                    unrecognised status &mdash; not shown in any column
                  </span>
                )}
              </div>
            </section>

            <aside className="w-full lg:w-[420px] shrink-0 bg-[#12141c] border border-white/10 rounded-2xl p-4 overflow-y-auto max-h-[70vh] lg:max-h-none">
              {!selected ? (
                <p className="text-sm text-slate-500 text-center py-12">Select a job to manage dispatch.</p>
              ) : (
                <BookingDetail
                  booking={selected}
                  techs={techs}
                  saving={saving}
                  actionError={actionError}
                  onPatch={handlePatch}
                  onReleaseToPool={handleReleaseToPool}
                />
              )}
            </aside>
          </div>
        </div>
      )}

      {tab === 'map' && (
        <DispatchMap
          bookings={bookings}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setTab('dispatch');
          }}
        />
      )}

      {tab === 'techs' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90 leading-relaxed">
            <strong className="text-amber-300">1099-NEC:</strong> {FORM_1099_NEC_NOTICE}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {techs.length === 0 ? (
            <p className="text-sm text-slate-500 col-span-full py-8 text-center">
              No technician profiles yet. Have techs sign in once on{' '}
              <strong className="text-slate-400">Portal → Tech Login</strong> (creates dispatch profile), or
              sign up with the Tech tab and role <code className="text-orange-300">tech</code>.
            </p>
          ) : (
            techs.map((t) => {
              return (
              <div key={t.id} className="bg-[#12141c] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-400" />
                  <p className="font-bold text-sm">{t.name}</p>
                </div>
                <p className="text-xs text-slate-400">{t.vanNumber || 'No van #'}</p>
                <p className="text-xs text-slate-500">{t.email || t.phone || '—'}</p>
                <p className="text-[10px] text-slate-500">
                  {t.toolsVerified ? 'Tools verified' : 'Tools not verified'}
                </p>
                <p
                  className={`text-[11px] font-bold ${
                    t.onShiftSince ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {t.onShiftSince
                    ? `● On shift since ${new Date(t.onShiftSince).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                    : '○ Off shift — cannot claim jobs'}
                </p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    t.lastSignInAt &&
                    Date.now() - new Date(t.lastSignInAt).getTime() < 24 * 60 * 60 * 1000
                      ? 'bg-emerald-400'
                      : t.lastSignInAt &&
                        Date.now() - new Date(t.lastSignInAt).getTime() < 7 * 24 * 60 * 60 * 1000
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`} />
                  {t.lastSignInAt
                    ? `Last login: ${new Date(t.lastSignInAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(t.lastSignInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                    : 'Never logged in'}
                </p>
              </div>
            );
            })
          )}
          </div>
        </section>
      )}
    </div>
  );
};

/* One colour per status, and the column header is the only place it is drawn —
   the card no longer repeats it, because the column a card sits in already says
   what its status is. Orange is reserved for "this is the job you selected",
   which is why ON_SITE keeps violet rather than taking the brand colour. */
const COLUMN_TONE: Record<BoardColumnId, { rule: string; text: string; chip: string }> = {
  needs_tech: { rule: 'border-amber-500/60', text: 'text-amber-300', chip: 'bg-amber-400 text-[#0b0c10]' },
  on_the_way: { rule: 'border-sky-500/60', text: 'text-sky-300', chip: 'bg-sky-400 text-[#0b0c10]' },
  on_site: { rule: 'border-violet-500/60', text: 'text-violet-300', chip: 'bg-violet-400 text-[#0b0c10]' },
  done: { rule: 'border-emerald-500/50', text: 'text-emerald-300', chip: 'bg-emerald-400 text-[#0b0c10]' },
  canceled: { rule: 'border-white/15', text: 'text-slate-400', chip: 'bg-slate-500 text-white' },
};

const TECH_STATE_STYLE: Record<TechBoardState<Booking>['kind'], { dot: string; label: string }> = {
  on_job: { dot: 'bg-sky-400', label: 'text-sky-300' },
  free: { dot: 'bg-emerald-400', label: 'text-emerald-300' },
  off_shift: { dot: 'bg-slate-600', label: 'text-slate-500' },
};

/** Who is free right now, across the top of the board. */
const TechStrip: React.FC<{ states: TechBoardState<Booking>[] }> = ({ states }) => {
  if (states.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {states.map((s) => {
        const style = TECH_STATE_STYLE[s.kind];
        const detail =
          s.kind === 'on_job'
            ? `${s.activeJob?.status === 'ON_SITE' ? 'On site' : 'On the way'} · ${s.activeJob?.id ?? ''}`
            : s.kind === 'free'
              ? 'Free — can take a job'
              : 'Off shift — cannot claim';
        return (
          <div
            key={s.tech.id}
            className="shrink-0 flex items-center gap-2.5 bg-[#12141c] border border-white/10 rounded-xl px-3 py-2"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{s.tech.name}</p>
              <p className={`text-[10px] truncate ${style.label}`}>{detail}</p>
            </div>
            {s.openJobs > 1 && (
              <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-white/5 rounded px-1.5 py-0.5">
                {s.openJobs} open
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const BoardColumnView: React.FC<{
  group: BoardGroup<Booking>;
  techs: DispatchTech[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hiddenOnNarrow: boolean;
}> = ({ group, techs, selectedId, onSelect, hiddenOnNarrow }) => {
  const tone = COLUMN_TONE[group.column.id];
  return (
    <div
      className={`${hiddenOnNarrow ? 'hidden lg:flex' : 'flex'} flex-col gap-2 flex-1 basis-0 min-w-0`}
    >
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${tone.rule}`}>
        <h2
          className={`font-heading text-[11px] font-bold uppercase tracking-wider truncate ${tone.text}`}
        >
          {group.column.label}
        </h2>
        <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${tone.chip}`}>
          {group.total}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
        {group.jobs.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-8">Nothing here.</p>
        ) : (
          group.jobs.map((b) => (
            <JobCard
              key={b.id}
              booking={b}
              techs={techs}
              selected={selectedId === b.id}
              onSelect={onSelect}
            />
          ))
        )}
        {group.hidden > 0 && (
          <p className="text-[10px] text-slate-500 text-center py-2">
            +{group.hidden} older not shown
          </p>
        )}
      </div>
    </div>
  );
};

const JobCard: React.FC<{
  booking: Booking;
  techs: DispatchTech[];
  selected: boolean;
  onSelect: (id: string) => void;
}> = ({ booking, techs, selected, onSelect }) => {
  const zip = lookupServiceZip(booking.zipCode);
  const age = unclaimedAgeMinutes(booking);
  const slaHot = age != null && age >= SLA_UNCLAIMED_ALERT_MINUTES;
  const schedule = formatPreferredSchedule(booking.preferredDate, booking.preferredTimeWindow);
  const primaryService = booking.services[0] || 'Service call';
  const extraServices = Math.max(0, booking.services.length - 1);
  /* Travel is free across the whole dispatch radius, so distance only matters
     when a booking came in from beyond it — that one needs a decision before
     anybody drives. */
  const outsideRadius = booking.distanceMiles > SERVICE_RADIUS_MILES;
  const addressUnusable = isIncompleteServiceAddress(booking.customerAddress);

  return (
    <button
      type="button"
      onClick={() => onSelect(booking.id)}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        selected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-white/10 bg-[#12141c] hover:border-white/25'
      }`}
    >
      <p className="text-[13px] font-bold text-white leading-snug">
        {primaryService}
        {extraServices > 0 && (
          <span className="font-semibold text-slate-400"> +{extraServices}</span>
        )}
      </p>
      {schedule && <p className="text-[10px] font-bold text-slate-300 mt-1">{schedule}</p>}
      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed break-words">
        {booking.vehicle}
      </p>
      <p className="text-[11px] text-slate-500">
        {zip?.city || booking.zipCode || 'Location unknown'} · {Math.round(booking.distanceMiles)} mi ·{' '}
        ${booking.totalEstimate.toFixed(2)}
      </p>

      {(outsideRadius || addressUnusable || slaHot) && (
        <span className="flex flex-wrap gap-1 mt-2">
          {addressUnusable && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
              Address needs fixing
            </span>
          )}
          {outsideRadius && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
              Outside the {SERVICE_RADIUS_MILES} mi radius
            </span>
          )}
          {slaHot && (
            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
              {age}m unclaimed
            </span>
          )}
        </span>
      )}

      {booking.claimedBy && (
        <p className="text-[11px] font-semibold text-orange-400 mt-2 truncate">
          {getAssignedTechName(booking, techs)}
        </p>
      )}
      <p className="text-[10px] text-slate-600 mt-2 tracking-wide">{booking.id}</p>
    </button>
  );
};

type BookingDetailProps = {
  booking: Booking;
  techs: DispatchTech[];
  saving: boolean;
  actionError: string | null;
  onPatch: (ref: string, patch: Parameters<typeof adminPatchBooking>[1]) => Promise<void>;
  onReleaseToPool: (ref: string, cancelReason?: string) => Promise<void>;
};

const BookingDetail: React.FC<BookingDetailProps> = ({
  booking,
  techs,
  saving,
  actionError,
  onPatch,
  onReleaseToPool,
}) => {
  const mechanicId = booking.claimedBy?.id ?? '';
  const [cancelReason, setCancelReason] = useState<string>('customer_request');
  const [autoAssignMsg, setAutoAssignMsg] = useState<string | null>(null);

  // Dispatch Invoice & Transaction state
  const [laborLines, setLaborLines] = useState<Array<{ title: string; amount: string }>>([
    { title: 'Diagnostic & Mechanical Labor', amount: '' },
  ]);
  const [partsLines, setPartsLines] = useState<Array<{ title: string; amount: string }>>([
    { title: 'Replacement Parts', amount: '' },
  ]);
  const [mileageFee, setMileageFee] = useState('');
  const [includeDiagnosticFee, setIncludeDiagnosticFee] = useState(false);
  const [taxMode, setTaxMode] = useState<'parts' | 'total' | 'none'>('parts');
  const [partsPurchasedBy, setPartsPurchasedBy] = useState<'tech' | 'company'>('tech');
  const taxRatePercent = '8.25';
  const [dispatchInvoiceNotes, setDispatchInvoiceNotes] = useState('');
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null);
  const [isChargingInvoice, setIsChargingInvoice] = useState(false);

  const quotedDollars = (booking.holdAmountCents ?? DIAGNOSTIC_FEE_DOLLARS * 100) / 100;
  const appliedDiagnosticDollars = includeDiagnosticFee ? quotedDollars : 0;
  const laborTotal = laborLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const partsTotal = partsLines.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const mileageTotal = Number(mileageFee) || 0;
  const subtotalBeforeTax = appliedDiagnosticDollars + laborTotal + partsTotal + mileageTotal;

  const currentTaxRate = (Number(taxRatePercent) || 8.25) / 100;
  const taxableBase =
    taxMode === 'parts' ? partsTotal : taxMode === 'total' ? subtotalBeforeTax : 0;
  const texasSalesTax = Math.round(taxableBase * currentTaxRate * 100) / 100;
  const invoiceGrandTotal = subtotalBeforeTax + texasSalesTax;

  const laborAndDiagSubtotal = appliedDiagnosticDollars + laborTotal + mileageTotal;
  const techLaborShare = Math.round(laborAndDiagSubtotal * 0.70 * 100) / 100;
  const techPartsShare = partsPurchasedBy === 'tech' ? partsTotal : 0;
  const techPayoutTotal = techLaborShare + techPartsShare;

  const handleDispatchFinalCharge = async () => {
    if (
      !window.confirm(
        `Charge customer $${invoiceGrandTotal.toFixed(
          2
        )} (${includeDiagnosticFee ? `$${quotedDollars.toFixed(0)} diag + ` : 'diag waived + '}$${texasSalesTax.toFixed(
          2
        )} Texas Sales Tax) and complete job?`
      )
    ) {
      return;
    }
    setIsChargingInvoice(true);
    setInvoiceMsg(null);
    try {
      const lineItems: Array<{ title: string; laborDollars: number; partsDollars: number }> = [];

      for (const l of laborLines) {
        const amt = Number(l.amount) || 0;
        if (amt > 0 && l.title.trim()) {
          lineItems.push({ title: l.title.trim(), laborDollars: amt, partsDollars: 0 });
        }
      }
      for (const p of partsLines) {
        const amt = Number(p.amount) || 0;
        if (amt > 0 && p.title.trim()) {
          lineItems.push({ title: p.title.trim(), laborDollars: 0, partsDollars: amt });
        }
      }
      if (mileageTotal > 0) {
        lineItems.push({
          title: 'Dispatch Travel & Mileage',
          laborDollars: mileageTotal,
          partsDollars: 0,
        });
      }
      if (texasSalesTax > 0) {
        lineItems.push({
          title: `Texas Sales Tax (${(currentTaxRate * 100).toFixed(2)}%${
            taxMode === 'parts' ? ' on parts' : ''
          })`,
          laborDollars: 0,
          partsDollars: texasSalesTax,
        });
      }

      if (lineItems.length === 0 && invoiceGrandTotal === 0) {
        setInvoiceMsg('Please enter parts, labor, or include diagnostic fee to process charge.');
        setIsChargingInvoice(false);
        return;
      }

      if (lineItems.length === 0 && includeDiagnosticFee) {
        // Diagnostic only, collected in person
        await recordInPersonPayment(booking.id, { totalCollectedDollars: quotedDollars });
      } else {
        await recordInPersonPayment(booking.id, {
          lineItems,
          includeDiagnosticFee,
          salesTaxDollars: texasSalesTax,
        });
      }

      // Automatically send digital receipt SMS to customer
      if (booking.customerPhone) {
        await sendChargeReceiptSmsAuto({
          phone: booking.customerPhone,
          customerName: booking.customerName,
          referenceCode: booking.id,
          amountDollars: invoiceGrandTotal,
          kind: 'charge',
          lines: lineItems,
          diagnosticDollars: appliedDiagnosticDollars,
          salesTaxDollars: texasSalesTax,
        });
      }

      setInvoiceMsg(`Successfully charged $${invoiceGrandTotal.toFixed(2)} and sent receipt!`);
      await onPatch(booking.id, { status: 'COMPLETED' });
    } catch (err: unknown) {
      setInvoiceMsg(err instanceof Error ? err.message : 'Charge failed');
    } finally {
      setIsChargingInvoice(false);
    }
  };

  const handleSendReceiptOnly = async () => {
    if (!booking.customerPhone) {
      setInvoiceMsg('No customer phone on file to send receipt.');
      return;
    }
    try {
      const capturedAmount =
        booking.capturedAmountCents ? booking.capturedAmountCents / 100 : invoiceGrandTotal;
      await sendChargeReceiptSmsAuto({
        phone: booking.customerPhone,
        customerName: booking.customerName,
        referenceCode: booking.id,
        amountDollars: capturedAmount,
        kind: 'charge',
        diagnosticDollars: quotedDollars,
      });
      setInvoiceMsg('Receipt SMS sent to customer!');
    } catch (err: unknown) {
      setInvoiceMsg(err instanceof Error ? err.message : 'Failed to send receipt SMS');
    }
  };

  /* Was gated on booking.paymentIntentId — a Stripe payment intent. Stripe is
     gone and nothing takes a card, so that field is null on every booking made
     since, and this control never rendered for anyone. It is a dispatch action,
     not a payment one: it hands an assigned job back to the open pool, which
     only makes sense while a technician has it claimed and the job is live. */
  const canReleaseToPool =
    Boolean(booking.claimedBy) &&
    booking.status !== 'COMPLETED' &&
    booking.status !== 'CANCELED';

  const age = unclaimedAgeMinutes(booking);

  const handleAutoAssign = async () => {
    setAutoAssignMsg(null);
    try {
      const result = await autoAssignNearestSpecialtyMatch(booking, techs);
      if (!result) {
        setAutoAssignMsg('No specialty-matched tech available.');
        return;
      }
      setAutoAssignMsg(`Assigned ${result.techName}`);
      await onPatch(booking.id, { mechanicId: result.techId, status: 'EN_ROUTE', etaMinutes: 30 });
    } catch (e) {
      setAutoAssignMsg(e instanceof Error ? e.message : 'Auto-assign failed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-extrabold text-white">{booking.id}</p>
        <p className="text-xs text-slate-500">{booking.dateCreated}</p>
        {age != null && (
          <p
            className={`text-[11px] mt-1 font-bold ${
              age >= SLA_UNCLAIMED_ALERT_MINUTES ? 'text-amber-300' : 'text-slate-400'
            }`}
          >
            Unclaimed {age} min
            {age >= SLA_UNCLAIMED_ALERT_MINUTES ? ` · SLA alert (>${SLA_UNCLAIMED_ALERT_MINUTES}m)` : ''}
          </p>
        )}
      </div>

      {booking.status === 'UNASSIGNED' && (
        <div className="space-y-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAutoAssign()}
            className="w-full text-xs font-bold text-sky-300 border border-sky-500/30 rounded-lg py-2 hover:bg-sky-500/10 disabled:opacity-50"
          >
            Auto-assign specialty match
          </button>
          {autoAssignMsg && <p className="text-[11px] text-slate-400">{autoAssignMsg}</p>}
        </div>
      )}

      {actionError && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      <div className="space-y-2 text-xs">
        <p className="flex items-center gap-2 text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-500" />
          {booking.customerName}
        </p>
        <p className="flex items-center gap-2 text-slate-400">
          <Phone className="w-3.5 h-3.5" />
          {booking.customerPhone}
        </p>
        <p className="flex items-start gap-2 text-slate-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Customer address
            </span>
            {booking.customerAddress}
            <a
              href={googleMapsSearchUrl(booking.customerAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-orange-400 hover:underline inline-flex items-center gap-0.5"
            >
              Maps <ExternalLink className="w-3 h-3" />
            </a>
            {isIncompleteServiceAddress(booking.customerAddress) && (
              <span className="block text-[10px] text-amber-400 mt-1">
                Address looks incomplete (house # / zip only). Ask the customer for street name + city.
              </span>
            )}
          </span>
        </p>
        {(booking.dispatchLat != null && booking.dispatchLng != null) && (
          <p className="flex items-start gap-2 text-slate-500 text-[11px]">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Live tech GPS (van location): {booking.dispatchLat.toFixed(4)},{' '}
              {booking.dispatchLng.toFixed(4)}
            </span>
          </p>
        )}
        {(booking.preferredDate || booking.preferredTimeWindow) && (
          <p className="text-xs text-orange-300 font-semibold">
            Scheduled:{' '}
            {[booking.preferredDate, booking.preferredTimeWindow].filter(Boolean).join(' · ')}
          </p>
        )}
        {booking.customerNotes && (
          <p className="text-[11px] text-slate-500">Notes: {booking.customerNotes}</p>
        )}
        <p className="flex items-center gap-2 text-slate-400">
          <Truck className="w-3.5 h-3.5" />
          {booking.vehicle}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Services</p>
        <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
          {booking.services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="text-sm font-bold text-orange-400 mt-2">
          Quoted ${booking.totalEstimate.toFixed(2)}
          {booking.capturedAmountCents
            ? ` · Collected ${formatMoney(booking.capturedAmountCents)}`
            : ' · Pay in person'}
        </p>
      </div>

      <div className="rounded-xl bg-[#0b0c10] border border-white/10 p-3 space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Payment
        </p>
        <p className="text-xs text-slate-400">
          Status: <span className="text-slate-200">{booking.paymentStatus ?? 'none'}</span>
        </p>
      </div>

      {canReleaseToPool && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Reason for releasing</span>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              {CANCEL_REASON_PRESETS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onReleaseToPool(booking.id, cancelReason)}
            className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2 hover:bg-red-500/10 disabled:opacity-50"
          >
            Release back to the open pool
          </button>
        </div>
      )}

      {/* DISPATCH FINAL INVOICE & TRANSACTION CENTER */}
      {booking.status !== 'CANCELED' && booking.status !== 'COMPLETED' && (
        <div className="rounded-2xl border border-orange-500/30 bg-[#0d0e14] p-4 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white tracking-wider">
                  Dispatch Final Invoice & Charge
                </p>
                <p className="text-[10px] text-slate-400">Parts, Labor & Mileage final charge</p>
              </div>
            </div>
            <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              ${invoiceGrandTotal.toFixed(2)}
            </span>
          </div>

          {invoiceMsg && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
              {invoiceMsg}
            </p>
          )}

          {/* 1. Diagnostic Fee Handling (Waive vs Apply) */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                🔍 Mobile Diagnostic (${quotedDollars.toFixed(2)} on file)
              </span>
              <span className="font-mono font-bold text-white">
                {includeDiagnosticFee ? `$${quotedDollars.toFixed(2)}` : 'WAIVED ($0.00)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIncludeDiagnosticFee(false)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  !includeDiagnosticFee
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                ✓ Waive Diagnostic Fee
              </button>
              <button
                type="button"
                onClick={() => setIncludeDiagnosticFee(true)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  includeDiagnosticFee
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                + Charge ${quotedDollars.toFixed(0)} Diag Fee
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              {!includeDiagnosticFee
                ? `Free diagnostic with repair — the $${quotedDollars.toFixed(2)} diagnostic is credited toward the repair, so no separate diagnostic fee is collected.`
                : `The $${quotedDollars.toFixed(2)} diagnostic visit fee is charged on top of labor & parts.`}
            </p>
          </div>

          {/* 2. Labor Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-400">Labor Charges</p>
              <button
                type="button"
                onClick={() => setLaborLines([...laborLines, { title: '', amount: '' }])}
                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Labor
              </button>
            </div>
            {laborLines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Labor description (e.g. Brake pad & rotor swap)"
                  value={line.title}
                  onChange={(e) => {
                    const next = [...laborLines];
                    next[idx].title = e.target.value;
                    setLaborLines(next);
                  }}
                  className="flex-1 bg-[#12141c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <div className="w-24 relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) => {
                      const next = [...laborLines];
                      next[idx].amount = e.target.value;
                      setLaborLines(next);
                    }}
                    className="w-full bg-[#12141c] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                {laborLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLaborLines(laborLines.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 3. Parts Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-400">Parts & Supplies</p>
              <button
                type="button"
                onClick={() => setPartsLines([...partsLines, { title: '', amount: '' }])}
                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Part
              </button>
            </div>
            {partsLines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Part title (e.g. Duralast Ceramic Pads)"
                  value={line.title}
                  onChange={(e) => {
                    const next = [...partsLines];
                    next[idx].title = e.target.value;
                    setPartsLines(next);
                  }}
                  className="flex-1 bg-[#12141c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <div className="w-24 relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) => {
                      const next = [...partsLines];
                      next[idx].amount = e.target.value;
                      setPartsLines(next);
                    }}
                    className="w-full bg-[#12141c] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                {partsLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPartsLines(partsLines.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 4. Mileage / Travel Fee */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase font-bold text-slate-400">Mileage / Dispatch Travel Fee</p>
            <div className="flex gap-2 items-center">
              <input
                placeholder="Trip fee description (e.g. 20 miles roundtrip)"
                defaultValue="Mobile dispatch travel fee"
                className="flex-1 bg-[#12141c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <div className="w-24 relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mileageFee}
                  onChange={(e) => setMileageFee(e.target.value)}
                  className="w-full bg-[#12141c] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 5. Texas Sales Tax (8.25% State/Local) */}
          <div className="space-y-1.5 bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1">
                <span>🏛️ Texas Sales Tax (DFW 8.25%)</span>
              </p>
              <span className="font-mono text-xs font-bold text-amber-300">
                +${texasSalesTax.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setTaxMode('parts')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  taxMode === 'parts'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                Parts Only (8.25%)
              </button>
              <button
                type="button"
                onClick={() => setTaxMode('total')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  taxMode === 'total'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                Total Invoice (8.25%)
              </button>
              <button
                type="button"
                onClick={() => setTaxMode('none')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  taxMode === 'none'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                Tax Exempt (0%)
              </button>
            </div>
          </div>

          {/* 6. Parts Purchased By (100% reimbursed to Tech if tech paid out of pocket) */}
          {partsTotal > 0 && (
            <div className="space-y-1.5 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold text-slate-300">
                  📦 Parts Out-Of-Pocket
                </p>
                <span className="text-[10px] font-bold text-orange-400">
                  {partsPurchasedBy === 'tech' ? '100% reimbursed to tech' : 'Company paid (0% to tech)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setPartsPurchasedBy('tech')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    partsPurchasedBy === 'tech'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  👨‍🔧 Tech Bought Parts (100% to tech)
                </button>
                <button
                  type="button"
                  onClick={() => setPartsPurchasedBy('company')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    partsPurchasedBy === 'company'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  🏢 Company Supplied Parts
                </button>
              </div>
            </div>
          )}

          {/* 7. Dispatch Notes / Warranty for Customer */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Notes / Warranty (Optional)</p>
            <textarea
              placeholder="e.g. 12-month / 12,000-mile parts & labor warranty applied."
              value={dispatchInvoiceNotes}
              onChange={(e) => setDispatchInvoiceNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#12141c] border border-white/10 rounded-lg p-2 text-xs text-white resize-none"
            />
          </div>

          {/* Invoice Summary Box */}
          <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Diagnostic Fee:</span>
              <span className="font-mono font-semibold">
                {includeDiagnosticFee ? `$${quotedDollars.toFixed(2)}` : 'WAIVED ($0.00)'}
              </span>
            </div>
            {laborTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>Labor Total:</span>
                <span className="font-mono font-semibold">${laborTotal.toFixed(2)}</span>
              </div>
            )}
            {partsTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>Parts Total:</span>
                <span className="font-mono font-semibold">
                  ${partsTotal.toFixed(2)}{' '}
                  <span className="text-[10px] text-orange-400">
                    ({partsPurchasedBy === 'tech' ? '100% to tech' : 'company paid'})
                  </span>
                </span>
              </div>
            )}
            {mileageTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>Mileage / Travel:</span>
                <span className="font-mono font-semibold">${mileageTotal.toFixed(2)}</span>
              </div>
            )}
            {texasSalesTax > 0 && (
              <div className="flex justify-between text-xs text-amber-300 font-semibold">
                <span>Texas Sales Tax ({taxMode === 'parts' ? '8.25% on parts' : '8.25% total'}):</span>
                <span className="font-mono">${texasSalesTax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
              <span>Final Invoice Total:</span>
              <span className="text-orange-400 font-mono">${invoiceGrandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-orange-300/90 pt-1 border-t border-white/5">
              <span>👨‍🔧 Tech Payout Total:</span>
              <span className="font-mono text-orange-300 font-bold">${techPayoutTotal.toFixed(2)}</span>
            </div>
            {partsTotal > 0 && (
              <div className="text-[10px] text-slate-400 text-right">
                (${techLaborShare.toFixed(2)} labor 70% + ${techPartsShare.toFixed(2)} parts {partsPurchasedBy === 'tech' ? '100%' : '0%'})
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={saving || isChargingInvoice}
              onClick={() => void handleDispatchFinalCharge()}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 rounded-xl text-xs font-black uppercase text-white tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isChargingInvoice ? 'Processing Charge…' : `Charge Customer $${invoiceGrandTotal.toFixed(2)} & Complete`}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSendReceiptOnly()}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-orange-400" />
              <span>Send Itemized SMS Receipt to Customer</span>
            </button>
          </div>
        </div>
      )}



      <label className="block space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-500">Job status</span>
        <select
          value={booking.status}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.value as JobStatus;
            if (next === 'CANCELED') {
              void onPatch(booking.id, { status: next, cancelReason });
            } else {
              void onPatch(booking.id, { status: next });
            }
          }}
          className="w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      {booking.status !== 'CANCELED' && !canReleaseToPool && (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">
            Cancel reason (if canceling via status)
          </span>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {CANCEL_REASON_PRESETS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-500">Assigned technician</span>
        <select
          value={mechanicId}
          disabled={saving}
          onChange={(e) => {
            const id = e.target.value || null;
            void onPatch(booking.id, {
              mechanicId: id,
              status: id && booking.status === 'UNASSIGNED' ? 'EN_ROUTE' : booking.status,
            });
          }}
          className="w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">— Unassigned —</option>
          {techs.map((t) => {
            const canClaim = techCanClaimServices(t.specialties || ['mechanical'], booking.services);
            return (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.vanNumber ? ` (${t.vanNumber})` : ''}
                {canClaim ? '' : ' (specialty mismatch)'}
              </option>
            );
          })}
        </select>
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          void onPatch(booking.id, {
            mechanicId: null,
            status: 'UNASSIGNED',
            etaMinutes: 0,
            distanceMiles: 0,
          })
        }
        className="w-full text-xs font-bold text-amber-300 border border-amber-500/30 rounded-lg py-2 hover:bg-amber-500/10 disabled:opacity-50"
      >
        Release to open pool
      </button>
    </div>
  );
};
