import type { Booking } from '../context/BookingContext';
import {
  DISPATCH_HUB,
  googleMapsDestinationUrl,
  googleMapsSearchUrl,
  openStreetMapEmbedUrl,
  openStreetMapMarkerUrl,
} from '../config/stripeDashboard';
import { ExternalLink, MapPin } from 'lucide-react';

type DispatchMapProps = {
  bookings: Booking[];
  selectedId: string | null;
  onSelect: (referenceCode: string) => void;
};

function mapCenter(
  bookings: Booking[],
  selectedId: string | null
): { lat: number; lng: number; live: boolean } {
  const withCoords = bookings.filter((b) => b.dispatchLat != null && b.dispatchLng != null);
  const selected = selectedId
    ? withCoords.find((b) => b.id === selectedId)
    : undefined;
  if (selected?.dispatchLat != null && selected.dispatchLng != null) {
    return { lat: selected.dispatchLat, lng: selected.dispatchLng, live: true };
  }
  if (withCoords.length === 0) return { lat: DISPATCH_HUB.lat, lng: DISPATCH_HUB.lng, live: false };
  const lat =
    withCoords.reduce((s, b) => s + (b.dispatchLat as number), 0) / withCoords.length;
  const lng =
    withCoords.reduce((s, b) => s + (b.dispatchLng as number), 0) / withCoords.length;
  return { lat, lng, live: true };
}

export function DispatchMap({ bookings, selectedId, onSelect }: DispatchMapProps) {
  const active = bookings.filter((b) => b.status !== 'COMPLETED');
  const pool = active.length ? active : bookings;
  const center = mapCenter(pool, selectedId);
  const embedUrl = openStreetMapEmbedUrl(center.lat, center.lng, 10);
  const hasAnyGps = pool.some((b) => b.dispatchLat != null && b.dispatchLng != null);

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
          {hasAnyGps
            ? selectedId &&
              pool.some((b) => b.id === selectedId && b.dispatchLat != null)
              ? 'Map centered on selected booking live GPS.'
              : 'Map centered on live GPS from active jobs.'
            : `Map centered on ${DISPATCH_HUB.label}. Live GPS pins appear when techs share location.`}
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
            active.map((b) => {
              const hasGps = b.dispatchLat != null && b.dispatchLng != null;
              return (
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
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {hasGps ? (
                        <>
                          <a
                            href={openStreetMapMarkerUrl(
                              b.dispatchLat as number,
                              b.dispatchLng as number
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            Tech GPS pin
                          </a>
                          <a
                            href={googleMapsDestinationUrl(
                              b.dispatchLat as number,
                              b.dispatchLng as number
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Navigate to tech
                          </a>
                        </>
                      ) : (
                        <a
                          href={googleMapsSearchUrl(b.customerAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Maps (customer address)
                        </a>
                      )}
                    </div>
                    {hasGps && (
                      <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        Live tech GPS: {(b.dispatchLat as number).toFixed(4)},{' '}
                        {(b.dispatchLng as number).toFixed(4)}
                      </p>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
