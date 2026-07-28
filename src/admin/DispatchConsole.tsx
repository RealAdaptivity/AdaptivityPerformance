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
} from 'lucide-react';
import {
  stripeConnectAccountDashboardUrl,
  stripePaymentIntentDashboardUrl,
  googleMapsSearchUrl,
} from '../config/stripeDashboard';
import { DispatchMap } from './DispatchMap';
import type { Booking, JobStatus } from '../context/BookingContext';
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
import { FORM_1099_NEC_NOTICE, FORM_1099_NEC_THRESHOLD_DOLLARS } from '../content/taxForms';
import { techCanClaimServices } from '../services/serviceCatalog';

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

  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  const handlePatch = async (
    referenceCode: string,
    patch: Parameters<typeof adminPatchBooking>[1]
  ) => {
    setSaving(true);
    setActionError(null);
    try {
      if (patch.status === 'CANCELED') {
        await adminCancelBookingHold(referenceCode, true);
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

  const handleCancelHold = async (referenceCode: string) => {
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
      await adminCancelBookingHold(referenceCode, true);
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
                  {filtered.map((b) => (
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
                          {statusBadge(b.status)}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">{b.vehicle}</p>
                        <p className="text-[11px] text-slate-500">
                          {b.claimedBy ? b.claimedBy.name : 'Unassigned'} · ${b.totalEstimate.toFixed(2)}
                        </p>
                      </button>
                    </li>
                  ))}
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
                onAdjustCapture={async (ref, amount, markCompleted) => {
                  setSaving(true);
                  setActionError(null);
                  try {
                    await adminAdjustCapture(ref, amount, markCompleted);
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
  onCancelHold: (ref: string) => Promise<void>;
  onAdjustCapture: (ref: string, amount: number, markCompleted: boolean) => Promise<void>;
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
  const [partialCapture, setPartialCapture] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [forceAfterPayout, setForceAfterPayout] = useState(false);
  const canCancelHold =
    booking.paymentIntentId &&
    booking.paymentStatus !== 'captured' &&
    booking.paymentStatus !== 'canceled' &&
    booking.paymentStatus !== 'refunded';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-extrabold text-white">{booking.id}</p>
        <p className="text-xs text-slate-500">{booking.dateCreated}</p>
      </div>

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
            {booking.customerAddress}
            <a
              href={googleMapsSearchUrl(booking.customerAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-orange-400 hover:underline inline-flex items-center gap-0.5"
            >
              Maps <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        </p>
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
        <button
          type="button"
          disabled={saving}
          onClick={() => void onCancelHold(booking.id)}
          className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2 hover:bg-red-500/10 disabled:opacity-50"
        >
          Cancel card hold & release job
        </button>
      )}

      {booking.paymentStatus === 'authorized' ||
      booking.paymentStatus === 'awaiting_card' ||
      (booking.paymentIntentId && booking.paymentStatus !== 'captured') ? (
        <div className="rounded-xl border border-white/10 p-3 space-y-2 bg-[#0b0c10]">
          <p className="text-[10px] uppercase font-bold text-slate-500">Partial capture (admin)</p>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount USD"
            value={partialCapture}
            onChange={(e) => setPartialCapture(e.target.value)}
            className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving || !partialCapture}
            onClick={() =>
              void onAdjustCapture(booking.id, Number(partialCapture), false)
            }
            className="w-full text-xs font-bold text-orange-300 border border-orange-500/30 rounded-lg py-2"
          >
            Capture amount (hold)
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (
                !window.confirm(
                  'Capture $100 diagnostic hold for no-show / missed appointment and mark job completed?'
                )
              ) {
                return;
              }
              void onAdjustCapture(booking.id, 100, true);
            }}
            className="w-full text-xs font-bold text-red-300 border border-red-500/30 rounded-lg py-2"
          >
            No-show — capture $100 & complete
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
          onChange={(e) => void onPatch(booking.id, { status: e.target.value as JobStatus })}
          className="w-full bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

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
