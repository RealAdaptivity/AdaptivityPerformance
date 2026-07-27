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
      <p className="text-xs text-slate-400">Enter your job reference from booking confirmation (e.g. AP-8492).</p>
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
