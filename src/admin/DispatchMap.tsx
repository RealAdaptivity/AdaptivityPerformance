import type { Booking } from '../context/BookingContext';
import {
  DISPATCH_HUB,
  googleMapsSearchUrl,
  openStreetMapEmbedUrl,
} from '../config/stripeDashboard';
import { ExternalLink, MapPin } from 'lucide-react';

type DispatchMapProps = {
  bookings: Booking[];
  selectedId: string | null;
  onSelect: (referenceCode: string) => void;
};

function mapCenter(bookings: Booking[]): { lat: number; lng: number } {
  const withCoords = bookings.filter((b) => b.dispatchLat != null && b.dispatchLng != null);
  if (withCoords.length === 0) return { lat: DISPATCH_HUB.lat, lng: DISPATCH_HUB.lng };
  const lat =
    withCoords.reduce((s, b) => s + (b.dispatchLat as number), 0) / withCoords.length;
  const lng =
    withCoords.reduce((s, b) => s + (b.dispatchLng as number), 0) / withCoords.length;
  return { lat, lng };
}

export function DispatchMap({ bookings, selectedId, onSelect }: DispatchMapProps) {
  const active = bookings.filter((b) => b.status !== 'COMPLETED');
  const center = mapCenter(active.length ? active : bookings);
  const embedUrl = openStreetMapEmbedUrl(center.lat, center.lng, 10);

  return (
    <div className="grid lg:grid-cols-5 gap-4 min-h-[420px]">
      <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-[#0b0c10] min-h-[280px]">
        <iframe
          title="Dispatch map"
          src={embedUrl}
          className="w-full h-full min-h-[280px] border-0 grayscale-[30%] contrast-[1.05]"
          loading="lazy"
        />
        <p className="text-[10px] text-slate-600 px-3 py-1.5 border-t border-white/5">
          Map centered on {active.some((b) => b.dispatchLat != null) ? 'active job GPS' : DISPATCH_HUB.label}.
          Pin GPS from the tech app when live tracking ships.
        </p>
      </div>

      <div className="lg:col-span-2 flex flex-col bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active jobs</p>
          <p className="text-[10px] text-slate-600">{active.length} on board</p>
        </div>
        <ul className="overflow-auto flex-1 divide-y divide-white/5 max-h-[360px]">
          {active.length === 0 ? (
            <li className="px-4 py-8 text-sm text-slate-500 text-center">No active dispatches.</li>
          ) : (
            active.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] ${
                    selectedId === b.id ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <p className="text-sm font-bold text-white">{b.id}</p>
                  <p className="text-xs text-slate-400 truncate">{b.customerAddress}</p>
                  <a
                    href={googleMapsSearchUrl(b.customerAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] text-orange-400 mt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Google Maps
                  </a>
                  {b.dispatchLat != null && b.dispatchLng != null && (
                    <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {b.dispatchLat.toFixed(4)}, {b.dispatchLng.toFixed(4)}
                    </p>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
