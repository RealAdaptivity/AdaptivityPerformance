import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Truck,
  User,
  Wrench,
  Receipt,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';
import {
  stripeConnectAccountDashboardUrl,
  stripePaymentIntentDashboardUrl,
  googleMapsSearchUrl,
} from '../config/stripeDashboard';
import { DispatchMap } from './DispatchMap';
import type { Booking, JobStatus } from '../context/BookingContext';
import { isIncompleteServiceAddress } from '../services/serviceAddress';
import {
  adminCancelBookingHold,
  adminAdjustCapture,
  adminRefundBooking,
  adminRetryTransfer,
  adminPatchBooking,
  fetchAdminBookings,
  fetchAdminPayments,
  fetchDispatchTechs,
  fetchAdminNecYtdByStripeAccount,
  subscribeAdminBookings,
  type AdminPaymentRow,
  type DispatchTech,
} from '../services/adminApi';
import { captureBookingPayment } from '../services/techDispatch';
import { sendChargeReceiptSmsAuto } from '../services/sendSms';
import { FORM_1099_NEC_NOTICE, FORM_1099_NEC_THRESHOLD_DOLLARS } from '../content/taxForms';
import { techCanClaimServices } from '../services/serviceCatalog';
import {
  CANCEL_REASON_PRESETS,
  NO_SHOW_REASON_PRESETS,
  suggestedRefundForCancelReason,
} from '../services/adminAnalytics';
import {
  autoAssignNearestSpecialtyMatch,
  SLA_UNCLAIMED_ALERT_MINUTES,
  unclaimedAgeMinutes,
} from '../services/adminOpsExtras';

type TabId = 'dispatch' | 'map' | 'payments' | 'techs';
type StatusFilter = 'ALL' | JobStatus;

const STATUS_OPTIONS: JobStatus[] = ['UNASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELED'];

function statusBadge(status: JobStatus) {
  const styles: Record<JobStatus, string> = {
    UNASSIGNED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    EN_ROUTE: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    ON_SITE: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    CANCELED: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

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
  const [necYtdByAcct, setNecYtdByAcct] = useState<Map<string, number>>(new Map());
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, t, p, nec] = await Promise.all([
        fetchAdminBookings(),
        fetchDispatchTechs(),
        fetchAdminPayments(),
        fetchAdminNecYtdByStripeAccount().catch(() => new Map<string, number>()),
      ]);
      setBookings(b);
      setTechs(t);
      setPayments(p);
      setNecYtdByAcct(nec);
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

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

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
      if (patch.status === 'CANCELED') {
        await adminCancelBookingHold(referenceCode, true, patch.cancelReason || undefined);
      } else {
        await adminPatchBooking(referenceCode, patch);
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelHold = async (referenceCode: string, cancelReason?: string) => {
    if (
      !window.confirm(
        'Cancel the Stripe card hold and release this job to the open pool? This cannot undo a captured payment.'
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
      setActionError(e instanceof Error ? e.message : 'Cancel hold failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dispatch', label: 'Dispatch board' },
    { id: 'map', label: 'Map' },
    { id: 'payments', label: 'Payments' },
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
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {tab === 'dispatch' && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[480px]">
          <section className="flex-1 min-w-0 flex flex-col bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter</span>
              {(['ALL', ...STATUS_OPTIONS] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                    statusFilter === s
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-slate-500">{filtered.length} jobs</span>
              {slaBreaches > 0 && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
                  {slaBreaches} SLA &gt;{SLA_UNCLAIMED_ALERT_MINUTES}m
                </span>
              )}
            </div>

            <div className="overflow-auto flex-1">
              {loading && bookings.length === 0 ? (
                <div className="flex justify-center py-16 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-16">No bookings match this filter.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {filtered.map((b) => {
                    const age = unclaimedAgeMinutes(b);
                    const slaHot = age != null && age >= SLA_UNCLAIMED_ALERT_MINUTES;
                    return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(b.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                          selectedId === b.id ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-white">{b.id}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{b.customerName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {statusBadge(b.status)}
                            {slaHot && (
                              <span className="text-[9px] font-bold text-amber-300">{age}m unclaimed</span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">{b.vehicle}</p>
                        <p className="text-[11px] text-slate-400">
                          <span className={b.claimedBy ? 'text-orange-400 font-semibold' : 'text-slate-500'}>
                            {b.claimedBy ? `👨‍🔧 ${getAssignedTechName(b, techs)}` : 'Unassigned'}
                          </span>{' '}
                          · ${b.totalEstimate.toFixed(2)}
                        </p>
                      </button>
                    </li>
                    );
                  })}
                </ul>
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
                onCancelHold={handleCancelHold}
                onAdjustCapture={async (ref, amount, markCompleted, noShowReason) => {
                  setSaving(true);
                  setActionError(null);
                  try {
                    await adminAdjustCapture(ref, amount, markCompleted, noShowReason);
                    await load();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Capture failed');
                  } finally {
                    setSaving(false);
                  }
                }}
                onRefund={async (ref, amount, forceAfterPayout) => {
                  setSaving(true);
                  setActionError(null);
                  try {
                    await adminRefundBooking(ref, amount, forceAfterPayout);
                    await load();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Refund failed');
                  } finally {
                    setSaving(false);
                  }
                }}
                onRetryTransfer={async (ref) => {
                  setSaving(true);
                  setActionError(null);
                  try {
                    await adminRetryTransfer(ref);
                    await load();
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Retry transfer failed');
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}
          </aside>
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

      {tab === 'payments' && (
        <section className="bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden">
          {actionError && (
            <p className="text-xs text-red-400 px-4 py-2 border-b border-red-500/20 bg-red-500/5">
              {actionError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0c10] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Booking</th>
                  <th className="px-4 py-3 font-bold">Amount</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Payout</th>
                  <th className="px-4 py-3 font-bold">Transfer</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No payment records yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const needsTransfer =
                      p.status === 'succeeded' &&
                      !p.stripeTransferId &&
                      ['retry_pending', 'skipped', 'none', 'awaiting_capture'].includes(p.payoutStatus);
                    const canRefund =
                      (p.status === 'succeeded' || p.status === 'partially_refunded') &&
                      Boolean(p.bookingReference);
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-orange-200/90">
                          {p.bookingReference || '—'}
                          {p.payoutError ? (
                            <p className="text-[10px] text-amber-400/90 mt-1 max-w-[180px]">{p.payoutError}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{formatMoney(p.amountCents)}</td>
                        <td className="px-4 py-3 text-slate-300">{p.status}</td>
                        <td className="px-4 py-3 text-slate-400">{p.payoutStatus}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500 truncate max-w-[100px]">
                          {p.stripeTransferId || '—'}
                        </td>
                        <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                          <a
                            href={stripePaymentIntentDashboardUrl(p.paymentIntentId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            PI
                          </a>
                          {p.techStripeAccountId && (
                            <a
                              href={stripeConnectAccountDashboardUrl(p.techStripeAccountId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:underline"
                            >
                              Connect
                            </a>
                          )}
                          {needsTransfer && p.bookingReference && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                setSaving(true);
                                setActionError(null);
                                void adminRetryTransfer(p.bookingReference!)
                                  .then(() => load())
                                  .catch((e) =>
                                    setActionError(e instanceof Error ? e.message : 'Retry failed')
                                  )
                                  .finally(() => setSaving(false));
                              }}
                              className="text-emerald-400 hover:underline disabled:opacity-50"
                            >
                              Retry transfer
                            </button>
                          )}
                          {canRefund && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Refund ${p.bookingReference}? This also reverses the tech Connect transfer when possible.`
                                  )
                                ) {
                                  return;
                                }
                                setSaving(true);
                                setActionError(null);
                                void adminRefundBooking(p.bookingReference!)
                                  .then(() => load())
                                  .catch((e) => {
                                    const msg = e instanceof Error ? e.message : 'Refund failed';
                                    if (msg.toLowerCase().includes('forceafterpayout')) {
                                      if (
                                        window.confirm(
                                          `${msg}\n\nForce refund + reverse attempt anyway?`
                                        )
                                      ) {
                                        return adminRefundBooking(p.bookingReference!, undefined, true).then(
                                          () => load()
                                        );
                                      }
                                    }
                                    setActionError(msg);
                                  })
                                  .finally(() => setSaving(false));
                              }}
                              className="text-red-400 hover:underline disabled:opacity-50"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
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
              const ytdCents = t.stripeAccountId ? necYtdByAcct.get(t.stripeAccountId) || 0 : 0;
              const ytdDollars = ytdCents / 100;
              const over = ytdCents >= FORM_1099_NEC_THRESHOLD_DOLLARS * 100;
              return (
              <div key={t.id} className="bg-[#12141c] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-400" />
                  <p className="font-bold text-sm">{t.name}</p>
                </div>
                <p className="text-xs text-slate-400">{t.vanNumber || 'No van #'}</p>
                <p className="text-xs text-slate-500">{t.email || t.phone || '—'}</p>
                <p className="text-[10px] text-slate-500">
                  Stripe:{' '}
                  {t.stripeAccountId ? (
                    <a
                      href={stripeConnectAccountDashboardUrl(t.stripeAccountId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Connected <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    'Not linked'
                  )}
                  {t.toolsVerified ? ' · Tools verified' : ''}
                </p>
                <p className={`text-[11px] ${over ? 'text-amber-300' : 'text-slate-400'}`}>
                  {new Date().getFullYear()} YTD tech share: ${ytdDollars.toFixed(2)}
                  {over
                    ? ` · 1099-NEC required (file + copy by Jan 31)`
                    : ` / $${FORM_1099_NEC_THRESHOLD_DOLLARS}`}
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

type BookingDetailProps = {
  booking: Booking;
  techs: DispatchTech[];
  saving: boolean;
  actionError: string | null;
  onPatch: (ref: string, patch: Parameters<typeof adminPatchBooking>[1]) => Promise<void>;
  onCancelHold: (ref: string, cancelReason?: string) => Promise<void>;
  onAdjustCapture: (
    ref: string,
    amount: number,
    markCompleted: boolean,
    noShowReason?: string
  ) => Promise<void>;
  onRefund: (ref: string, amount?: number, forceAfterPayout?: boolean) => Promise<void>;
  onRetryTransfer: (ref: string) => Promise<void>;
};

const BookingDetail: React.FC<BookingDetailProps> = ({
  booking,
  techs,
  saving,
  actionError,
  onPatch,
  onCancelHold,
  onAdjustCapture,
  onRefund,
  onRetryTransfer,
}) => {
  const mechanicId = booking.claimedBy?.id ?? '';
  const [refundAmount, setRefundAmount] = useState('');
  const [forceAfterPayout, setForceAfterPayout] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('customer_request');
  const [noShowReason, setNoShowReason] = useState<string>('no_answer');
  const [autoAssignMsg, setAutoAssignMsg] = useState<string | null>(null);

  // Dispatch Invoice & Transaction state
  const [laborLines, setLaborLines] = useState<Array<{ title: string; amount: string }>>([
    { title: 'Diagnostic & Mechanical Labor', amount: '' },
  ]);
  const [partsLines, setPartsLines] = useState<Array<{ title: string; amount: string }>>([
    { title: 'Replacement Parts', amount: '' },
  ]);
  const [mileageFee, setMileageFee] = useState('');
  const [taxMode, setTaxMode] = useState<'parts' | 'total' | 'none'>('parts');
  const taxRatePercent = '8.25';
  const [dispatchInvoiceNotes, setDispatchInvoiceNotes] = useState('');
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null);
  const [isChargingInvoice, setIsChargingInvoice] = useState(false);

  const holdDollars = (booking.holdAmountCents ?? 8500) / 100;
  const laborTotal = laborLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const partsTotal = partsLines.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const mileageTotal = Number(mileageFee) || 0;
  const subtotalBeforeTax = holdDollars + laborTotal + partsTotal + mileageTotal;

  const currentTaxRate = (Number(taxRatePercent) || 8.25) / 100;
  const taxableBase =
    taxMode === 'parts' ? partsTotal : taxMode === 'total' ? subtotalBeforeTax : 0;
  const texasSalesTax = Math.round(taxableBase * currentTaxRate * 100) / 100;
  const invoiceGrandTotal = subtotalBeforeTax + texasSalesTax;

  const handleDispatchFinalCharge = async () => {
    if (
      !window.confirm(
        `Charge customer $${invoiceGrandTotal.toFixed(
          2
        )} (including $${holdDollars.toFixed(0)} diagnostic hold & $${texasSalesTax.toFixed(
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

      if (lineItems.length === 0 && invoiceGrandTotal === holdDollars) {
        // Diagnostic only charge
        await captureBookingPayment(booking.id, { mode: 'diagnostic_only' });
      } else {
        await captureBookingPayment(booking.id, {
          mode: 'charge',
          lineItems,
          techNotes: dispatchInvoiceNotes,
          customerAgreedOnSite: true,
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
          diagnosticDollars: holdDollars,
          salesTaxDollars: texasSalesTax,
        });
      }

      setInvoiceMsg(`Successfully charged $${invoiceGrandTotal.toFixed(2)} (inc. $${texasSalesTax.toFixed(2)} Texas tax) and sent receipt!`);
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
        diagnosticDollars: holdDollars,
      });
      setInvoiceMsg('Receipt SMS sent to customer!');
    } catch (err: unknown) {
      setInvoiceMsg(err instanceof Error ? err.message : 'Failed to send receipt SMS');
    }
  };

  const canCancelHold =
    booking.paymentIntentId &&
    booking.paymentStatus !== 'captured' &&
    booking.paymentStatus !== 'canceled' &&
    booking.paymentStatus !== 'refunded';

  const age = unclaimedAgeMinutes(booking);
  const suggestedRefund = suggestedRefundForCancelReason(cancelReason);

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
        {booking.holdExpiresAt && booking.status !== 'COMPLETED' && booking.status !== 'CANCELED' && (
          <p className="text-[11px] text-slate-500 mt-1">
            Hold expires {new Date(booking.holdExpiresAt).toLocaleString()}
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
          Hold {formatMoney(booking.holdAmountCents)}
          {booking.capturedAmountCents
            ? ` · Charged ${formatMoney(booking.capturedAmountCents)}`
            : ` · Board est. $${booking.totalEstimate.toFixed(2)}`}
        </p>
      </div>

      <div className="rounded-xl bg-[#0b0c10] border border-white/10 p-3 space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Payment
        </p>
        <p className="text-xs text-slate-400">
          Status: <span className="text-slate-200">{booking.paymentStatus ?? 'none'}</span>
        </p>
        <p className="text-xs text-slate-400">Hold: {formatMoney(booking.holdAmountCents)}</p>
        <p className="text-xs text-slate-400">Captured: {formatMoney(booking.capturedAmountCents)}</p>
        {booking.paymentIntentId && (
          <>
            <p className="text-[10px] font-mono text-slate-500 break-all">{booking.paymentIntentId}</p>
            <a
              href={stripePaymentIntentDashboardUrl(booking.paymentIntentId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Stripe Dashboard
            </a>
          </>
        )}
      </div>

      {canCancelHold && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Cancel reason</span>
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
            onClick={() => void onCancelHold(booking.id, cancelReason)}
            className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2 hover:bg-red-500/10 disabled:opacity-50"
          >
            Cancel card hold & release job
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

          {/* 1. Diagnostic Visit (Base Hold) */}
          <div className="flex items-center justify-between text-xs bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
            <span className="font-semibold text-slate-300">🔍 Mobile Diagnostic Visit (Hold on file)</span>
            <span className="font-mono font-bold text-white">${holdDollars.toFixed(2)}</span>
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

          {/* 6. Dispatch Notes / Warranty for Customer */}
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
              <span>Diagnostic Visit (Hold):</span>
              <span className="font-mono font-semibold">${holdDollars.toFixed(2)}</span>
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
                <span className="font-mono font-semibold">${partsTotal.toFixed(2)}</span>
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

      {booking.paymentStatus === 'authorized' ||
      booking.paymentStatus === 'awaiting_card' ||
      (booking.paymentIntentId && booking.paymentStatus !== 'captured') ? (
        <div className="rounded-xl border border-white/10 p-3 space-y-2 bg-[#0b0c10]">
          <p className="text-[10px] uppercase font-bold text-slate-500">Quick Hold Capture (No-Show / Diagnostic Only)</p>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">No-show reason</span>
            <select
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              {NO_SHOW_REASON_PRESETS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (
                !window.confirm(
                  'Capture $85 diagnostic hold for no-show / missed appointment and mark job completed?'
                )
              ) {
                return;
              }
              void onAdjustCapture(booking.id, 85, true, noShowReason);
            }}
            className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2"
          >
            No-show — capture $85 & complete
          </button>
        </div>
      ) : null}

      {booking.paymentStatus === 'captured' || booking.paymentStatus === 'partially_refunded' ? (
        <div className="rounded-xl border border-white/10 p-3 space-y-2 bg-[#0b0c10]">
          <p className="text-[10px] uppercase font-bold text-slate-500">Support — money</p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onRetryTransfer(booking.id)}
            className="w-full text-xs font-bold text-emerald-300 border border-emerald-500/30 rounded-lg py-2"
          >
            Retry Connect transfer (70% tech)
          </button>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Refund reverses the tech Connect transfer when possible. If the tech already cashed out, check
            “force after payout” (may fail if Connect balance is empty).
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Full refund if empty"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {[25, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={saving}
                onClick={() => {
                  setRefundAmount(String(amt));
                  void onRefund(booking.id, amt, forceAfterPayout);
                }}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-300 border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                ${amt}
              </button>
            ))}
            {suggestedRefund != null && ![25, 50, 100].includes(suggestedRefund) && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setRefundAmount(String(suggestedRefund));
                  void onRefund(booking.id, suggestedRefund, forceAfterPayout);
                }}
                className="px-2.5 py-1.5 text-[11px] font-bold text-orange-300 border border-orange-500/30 rounded-lg"
              >
                ${suggestedRefund} (reason)
              </button>
            )}
            {suggestedRefund != null && [25, 50, 100].includes(suggestedRefund) && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setRefundAmount(String(suggestedRefund));
                  void onRefund(booking.id, suggestedRefund, forceAfterPayout);
                }}
                className="px-2.5 py-1.5 text-[11px] font-bold text-orange-300 border border-orange-500/30 rounded-lg"
              >
                Reason → ${suggestedRefund}
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setRefundAmount('');
                void onRefund(booking.id, undefined, forceAfterPayout);
              }}
              className="px-2.5 py-1.5 text-[11px] font-bold text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
            >
              Full
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Cancel reason preset suggests ${suggestedRefund ?? '—'} (set reason above when canceling).
          </p>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <input
              type="checkbox"
              checked={forceAfterPayout}
              onChange={(e) => setForceAfterPayout(e.target.checked)}
            />
            Force reverse after tech cash-out
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void onRefund(
                booking.id,
                refundAmount ? Number(refundAmount) : undefined,
                forceAfterPayout
              )
            }
            className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2"
          >
            Issue refund (+ reverse transfer)
          </button>
        </div>
      ) : null}

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

      {booking.status !== 'CANCELED' && !canCancelHold && (
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
