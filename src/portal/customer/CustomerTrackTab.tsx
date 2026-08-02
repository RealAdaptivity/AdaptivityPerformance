import React, { useCallback, useEffect, useState } from 'react';
import {
  addBookingTip,
  cancelCustomerBooking,
  fetchBookingByReference,
  rescheduleCustomerBooking,
  subscribeBookingReference,
  type TrackedBooking,
} from '../../services/trackBooking';
import { fetchJobPhotosByReference, uploadJobPhoto, type JobPhoto } from '../../services/jobPhotos';
import { openStreetMapEmbedUrl } from '../../config/stripeDashboard';
import {
  formatPreferredSchedule,
  PREFERRED_TIME_WINDOWS,
  todayISODate,
} from '../../services/scheduleWindows';
import { GOOGLE_REVIEW_URL } from '../../site/seo';
import { JobChatPanel } from '../../components/JobChatPanel';
import { supabase } from '../../services/supabaseClient';
import { formatLiveEta, etaMinutesFromGps } from '../../services/liveEta';

const STATUS_LABEL: Record<string, string> = {
  UNASSIGNED: 'Finding your technician',
  EN_ROUTE: 'Technician en route',
  ON_SITE: 'Technician on site',
  COMPLETED: 'Job completed',
  CANCELED: 'Booking canceled',
};

function dollars(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export const CustomerTrackTab: React.FC = () => {
  const [reference, setReference] = useState('');
  const [trackedRef, setTrackedRef] = useState<string | null>(null);
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(todayISODate());
  const [rescheduleWindow, setRescheduleWindow] = useState<string>(PREFERRED_TIME_WINDOWS[0]);
  const [selfId, setSelfId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async (ref: string) => {
    setLoading(true);
    setError(null);
    try {
      const row = await fetchBookingByReference(ref);
      if (!row) {
        setError('No booking found for that reference.');
        setBooking(null);
        setPhotos([]);
      } else {
        setBooking(row);
        const pics = await fetchJobPhotosByReference(ref).catch(() => []);
        setPhotos(pics);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!trackedRef) return;
    void load(trackedRef);
    const channel = subscribeBookingReference(trackedRef, () => void load(trackedRef));
    return () => {
      void channel.unsubscribe();
    };
  }, [trackedRef, load]);

  const canCancel =
    booking &&
    (booking.status === 'UNASSIGNED' || booking.status === 'EN_ROUTE') &&
    booking.paymentStatus !== 'captured' &&
    booking.paymentStatus !== 'canceled' &&
    booking.paymentStatus !== 'refunded';

  const canReschedule = Boolean(canCancel);
  const canAddBeforePhoto =
    Boolean(booking?.id) &&
    (booking?.status === 'UNASSIGNED' || booking?.status === 'EN_ROUTE');

  const handleAddBeforePhoto = async (file: File | null) => {
    if (!booking?.id || !file) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await uploadJobPhoto({ bookingId: booking.id, file, kind: 'before', caption: 'Customer photo' });
      setActionMsg('Photo shared with your technician.');
      const pics = await fetchJobPhotosByReference(booking.referenceCode).catch(() => []);
      setPhotos(pics);
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!booking || !confirm('Cancel this booking and release the card hold?')) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await cancelCustomerBooking(booking.referenceCode);
      setActionMsg('Booking canceled.');
      await load(booking.referenceCode);
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = async () => {
    if (!booking) return;
    if (
      booking.status === 'EN_ROUTE' &&
      !confirm(
        'A tech is already en route. Rescheduling keeps your card hold but releases the tech so someone can claim the new slot. Continue?'
      )
    ) {
      return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      const result = await rescheduleCustomerBooking({
        referenceCode: booking.referenceCode,
        preferredDate: rescheduleDate,
        preferredTimeWindow: rescheduleWindow,
      });
      setActionMsg(result.message || 'Rescheduled. Card hold kept.');
      setShowReschedule(false);
      await load(booking.referenceCode);
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : 'Reschedule failed');
    } finally {
      setBusy(false);
    }
  };

  const handleTip = async (amount: number) => {
    if (!booking) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await addBookingTip(booking.referenceCode, amount);
      setActionMsg(`Thanks — $${amount.toFixed(2)} tip sent to your technician.`);
      setCustomTip('');
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : 'Tip failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Enter your job reference from booking confirmation (e.g. AP-8492). Your tech sets the repair price on
        site after diagnosing — Adaptivity places a $10 diagnostic hold at booking.
      </p>
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value.toUpperCase())}
        placeholder="AP-1234"
        className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 font-mono text-white"
      />
      <button
        type="button"
        onClick={() => {
          const ref = reference.trim();
          if (ref) setTrackedRef(ref);
        }}
        className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
      >
        Track status
      </button>
      {loading && <p className="text-xs text-slate-500">Updating…</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {actionMsg && <p className="text-xs text-emerald-400">{actionMsg}</p>}
      {booking && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
          <p className="font-mono text-orange-400 font-bold">{booking.referenceCode}</p>
          <p className="text-white font-semibold">{STATUS_LABEL[booking.status] ?? booking.status}</p>
          <p className="text-xs text-slate-400">{booking.vehicle}</p>
          <p className="text-xs text-slate-500">{booking.customerAddress}</p>
          {formatPreferredSchedule(booking.preferredDate, booking.preferredTimeWindow) && (
            <p className="text-xs text-orange-300 font-semibold">
              Scheduled: {formatPreferredSchedule(booking.preferredDate, booking.preferredTimeWindow)}
            </p>
          )}
          {booking.status === 'EN_ROUTE' && (
            <p className="text-xs text-emerald-400">
              ETA ~{booking.etaMinutes} min · {booking.distanceMiles.toFixed(1)} mi
            </p>
          )}
          <p className="text-xs text-slate-400">Payment: {booking.paymentStatus.replace(/_/g, ' ')}</p>

          {booking.dispatchLat != null && booking.dispatchLng != null && (
            <div className="space-y-2">
              <iframe
                title="Technician map"
                src={openStreetMapEmbedUrl(booking.dispatchLat, booking.dispatchLng, 13)}
                className="w-full h-48 rounded-xl border border-white/10"
                loading="lazy"
              />
              {(booking.status === 'EN_ROUTE' || booking.status === 'ON_SITE') && (
                <p className="text-[11px] text-emerald-400">
                  {formatLiveEta(
                    etaMinutesFromGps({
                      techLat: booking.dispatchLat,
                      techLng: booking.dispatchLng,
                      fallbackEtaMinutes: booking.etaMinutes,
                    }).minutes,
                    booking.dispatchLat != null ? 'gps' : 'stored'
                  )}
                  {booking.distanceMiles ? ` · ~${booking.distanceMiles} mi` : ''}
                </p>
              )}
            </div>
          )}
          {booking.status === 'EN_ROUTE' &&
            (booking.dispatchLat == null || booking.dispatchLng == null) && (
              <p className="text-[11px] text-sky-300">ETA ~{booking.etaMinutes} min (updating…)</p>
            )}

          {booking.id &&
            booking.status !== 'COMPLETED' &&
            booking.status !== 'CANCELED' &&
            selfId && (
              <JobChatPanel bookingId={booking.id} selfId={selfId} title="Message your tech" />
            )}

          {(booking.quoteStatus === 'awaiting_diagnostic' || booking.status === 'ON_SITE') &&
            booking.paymentStatus !== 'captured' && (
              <p className="text-xs text-sky-300 leading-relaxed">
                Your tech is diagnosing on site and will agree labor + parts pricing with you before charging
                your card on file (hold first, then any remainder).
              </p>
            )}

          {(booking.quoteLineItems.length > 0 || booking.capturedAmountCents != null) &&
            booking.paymentStatus === 'captured' && (
              <div className="space-y-2 border border-white/10 rounded-xl p-3 bg-white/[0.03]">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Receipt</p>
                <ul className="space-y-1.5">
                  {booking.quoteLineItems.map((item, i) => (
                    <li key={i} className="space-y-0.5">
                      <div className="flex justify-between gap-2 text-xs text-slate-300">
                        <span>{item.title}</span>
                        <span className="font-mono text-white shrink-0">
                          {dollars((item.labor_cents || 0) + (item.parts_cents || 0))}
                        </span>
                      </div>
                      {(item.labor_cents > 0 || item.parts_cents > 0) &&
                        !(item.labor_cents > 0 && item.parts_cents === 0 && /diagnostic/i.test(item.title)) && (
                          <p className="text-[10px] text-slate-500">
                            {item.labor_cents > 0 ? `Labor ${dollars(item.labor_cents)}` : ''}
                            {item.labor_cents > 0 && item.parts_cents > 0 ? ' · ' : ''}
                            {item.parts_cents > 0 ? `Parts ${dollars(item.parts_cents)}` : ''}
                          </p>
                        )}
                    </li>
                  ))}
                </ul>
                {booking.quoteLineItems.length === 0 && booking.capturedAmountCents != null && (
                  <p className="text-[11px] text-slate-400">
                    Total charged (line detail unavailable for this job).
                  </p>
                )}
                {booking.quoteDiagnosticFeeCents != null && booking.quoteDiagnosticFeeCents > 0 && (
                  <p className="text-[10px] text-slate-500">
                    Includes {dollars(booking.quoteDiagnosticFeeCents)} diagnostic
                    {booking.quoteRepairsCents != null && booking.quoteRepairsCents > 0
                      ? ` + ${dollars(booking.quoteRepairsCents)} repairs`
                      : ''}
                  </p>
                )}
                <p className="flex justify-between text-white font-bold text-xs pt-1 border-t border-white/10">
                  <span>Total charged</span>
                  <span>{dollars(booking.capturedAmountCents ?? booking.quoteTotalCents)}</span>
                </p>
              </div>
            )}

          {booking.status === 'COMPLETED' && (
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs font-bold"
            >
              ★ Leave a Google review — it helps a lot
            </a>
          )}

          {booking.paymentStatus === 'captured' && booking.status !== 'CANCELED' && (
            <div className="space-y-2 border border-white/10 rounded-xl p-3">
              <p className="text-[11px] font-bold text-slate-300 uppercase">Tip your technician</p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleTip(amt)}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 disabled:opacity-50"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Custom $"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="flex-1 bg-[#0b0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={busy || !customTip || Number(customTip) < 1}
                  onClick={() => void handleTip(Number(customTip))}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-white/10 text-white disabled:opacity-50"
                >
                  Tip
                </button>
              </div>
            </div>
          )}

          {canReschedule && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
              {!showReschedule ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRescheduleDate(booking.preferredDate || todayISODate());
                    setRescheduleWindow(
                      booking.preferredTimeWindow || PREFERRED_TIME_WINDOWS[0]
                    );
                    setShowReschedule(true);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-orange-300 border border-orange-500/40 rounded-xl disabled:opacity-50"
                >
                  Reschedule appointment
                </button>
              ) : (
                <>
                  <p className="text-[11px] text-slate-400">
                    Card hold stays on file. If a tech is already en route, they are released for the new slot.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      min={todayISODate()}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="bg-[#0b0c10] border border-white/15 rounded-lg px-2 py-2 text-xs text-white"
                    />
                    <select
                      value={rescheduleWindow}
                      onChange={(e) => setRescheduleWindow(e.target.value)}
                      className="bg-[#0b0c10] border border-white/15 rounded-lg px-2 py-2 text-xs text-white"
                    >
                      {PREFERRED_TIME_WINDOWS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReschedule()}
                      className="flex-1 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg disabled:opacity-50"
                    >
                      Save new slot
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setShowReschedule(false)}
                      className="px-3 py-2 text-xs font-bold text-slate-400 border border-white/15 rounded-lg"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancel()}
              className="w-full py-2.5 text-xs font-bold text-rose-300 border border-rose-500/40 rounded-xl disabled:opacity-50"
            >
              Cancel booking & release hold
            </button>
          )}

          {booking.quoteStatus === 'quote_approved' && (
            <p className="text-xs text-emerald-400">Payment captured. Thanks!</p>
          )}
          {booking.quoteStatus === 'quote_declined' && (
            <p className="text-xs text-slate-400">Diagnostic visit only — booking hold applied.</p>
          )}

          {(canAddBeforePhoto || photos.length > 0) && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-300 uppercase">Job photos</p>
              {canAddBeforePhoto && (
                <label className="block w-full text-center py-2.5 rounded-xl border border-orange-500/40 text-orange-300 text-xs font-bold cursor-pointer disabled:opacity-50">
                  {busy ? 'Uploading…' : 'Add photo for tech'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = '';
                      void handleAddBeforePhoto(f);
                    }}
                  />
                </label>
              )}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((p) => (
                    <a key={p.id} href={p.publicUrl} target="_blank" rel="noreferrer">
                      <img
                        src={p.publicUrl}
                        alt={p.caption || p.kind}
                        className="w-full h-24 object-cover rounded-lg border border-white/10"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.customerAddress)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-orange-400 underline"
            >
              Service address maps
            </a>
            {booking.dispatchLat != null && booking.dispatchLng != null && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${booking.dispatchLat},${booking.dispatchLng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-400 underline"
              >
                Technician location
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
