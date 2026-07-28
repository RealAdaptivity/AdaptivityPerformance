import React, { useCallback, useEffect, useState } from 'react';
import {
  approveBookingQuote,
  declineBookingQuote,
  fetchBookingByReference,
  subscribeBookingReference,
  type TrackedBooking,
} from '../../services/trackBooking';

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
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (ref: string) => {
    setLoading(true);
    setError(null);
    try {
      const row = await fetchBookingByReference(ref);
      if (!row) {
        setError('No booking found for that reference.');
        setBooking(null);
      } else setBooking(row);
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

  const handleApprove = async () => {
    if (!booking) return;
    if (!confirm('Approve this quote and charge your card on file?')) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await approveBookingQuote(booking.referenceCode);
      setMessage(
        result.message ||
          `Approved — charged ${dollars(Math.round((result.capturedAmountDollars || 0) * 100))}.`
      );
      await load(booking.referenceCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not approve quote');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!booking) return;
    if (
      !confirm(
        'Decline repairs? The $100 diagnostic fee will be charged from your card hold and the visit will end.'
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await declineBookingQuote(booking.referenceCode);
      setMessage(result.message || 'Quote declined. Diagnostic fee charged.');
      await load(booking.referenceCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not decline quote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Enter your job reference from booking confirmation (e.g. AP-8492). Sign in with the account used to
        book if you need to approve a repair quote.
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
      {message && <p className="text-xs text-emerald-400">{message}</p>}
      {booking && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
          <p className="font-mono text-orange-400 font-bold">{booking.referenceCode}</p>
          <p className="text-white font-semibold">{STATUS_LABEL[booking.status] ?? booking.status}</p>
          <p className="text-xs text-slate-400">{booking.vehicle}</p>
          <p className="text-xs text-slate-500">{booking.customerAddress}</p>
          {booking.status === 'EN_ROUTE' && (
            <p className="text-xs text-emerald-400">
              ETA ~{booking.etaMinutes} min · {booking.distanceMiles.toFixed(1)} mi
            </p>
          )}
          <p className="text-xs text-slate-400">Payment: {booking.paymentStatus.replace(/_/g, ' ')}</p>

          {booking.quoteStatus === 'awaiting_diagnostic' && (
            <p className="text-xs text-sky-300 leading-relaxed">
              Diagnostic visit in progress. Your tech will send recommended repairs for your approval before
              any repair charge.
            </p>
          )}

          {booking.quoteStatus === 'quote_pending' && (
            <div className="space-y-3 border border-orange-500/30 rounded-xl p-3 bg-orange-500/5">
              <p className="text-[11px] font-bold text-orange-300 uppercase tracking-wide">
                Repair quote ready
              </p>
              {booking.quoteTechNotes && (
                <p className="text-xs text-slate-300">{booking.quoteTechNotes}</p>
              )}
              <ul className="space-y-1.5">
                {booking.quoteLineItems.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2 text-xs text-slate-300">
                    <span>{item.title}</span>
                    <span className="font-mono text-white shrink-0">
                      {dollars((item.labor_cents || 0) + (item.parts_cents || 0))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-white/10 pt-2">
                <p className="flex justify-between">
                  <span>Diagnostic (already held)</span>
                  <span>{dollars(booking.quoteDiagnosticFeeCents)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Recommended repairs</span>
                  <span>{dollars(booking.quoteRepairsCents)}</span>
                </p>
                <p className="flex justify-between text-white font-bold text-xs pt-1">
                  <span>Total if approved</span>
                  <span>{dollars(booking.quoteTotalCents)}</span>
                </p>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Approve charges your card for the total (hold first, then any remainder). Decline ends the
                visit and charges the diagnostic fee only.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDecline()}
                  className="py-2.5 rounded-xl text-xs font-bold border border-white/15 text-slate-300 disabled:opacity-50"
                >
                  Decline repairs
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleApprove()}
                  className="py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-50"
                >
                  {busy ? 'Working…' : 'Approve & pay'}
                </button>
              </div>
            </div>
          )}

          {booking.quoteStatus === 'quote_approved' && (
            <p className="text-xs text-emerald-400">Quote approved — payment captured. Thanks!</p>
          )}
          {booking.quoteStatus === 'quote_declined' && (
            <p className="text-xs text-slate-400">Repairs declined. Diagnostic fee applied.</p>
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
