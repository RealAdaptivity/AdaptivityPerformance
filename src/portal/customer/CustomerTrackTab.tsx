import React, { useCallback, useEffect, useState } from 'react';
import {
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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Enter your job reference from booking confirmation (e.g. AP-8492). Your tech sets the repair price on
        site after diagnosing — Adaptivity holds $100 at booking.
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

          {(booking.quoteStatus === 'awaiting_diagnostic' || booking.status === 'ON_SITE') &&
            booking.paymentStatus !== 'captured' && (
              <p className="text-xs text-sky-300 leading-relaxed">
                Your tech is diagnosing on site and will agree labor + parts pricing with you before charging
                your card on file (hold first, then any remainder).
              </p>
            )}

          {booking.quoteLineItems.length > 0 && booking.paymentStatus === 'captured' && (
            <div className="space-y-2 border border-white/10 rounded-xl p-3 bg-white/[0.03]">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Receipt</p>
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
              <p className="flex justify-between text-white font-bold text-xs pt-1 border-t border-white/10">
                <span>Total charged</span>
                <span>{dollars(booking.quoteTotalCents ?? booking.capturedAmountCents)}</span>
              </p>
            </div>
          )}

          {booking.quoteStatus === 'quote_approved' && (
            <p className="text-xs text-emerald-400">Payment captured. Thanks!</p>
          )}
          {booking.quoteStatus === 'quote_declined' && (
            <p className="text-xs text-slate-400">Diagnostic visit only — $100 applied.</p>
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
