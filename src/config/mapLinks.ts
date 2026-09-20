/** Map deep links and the dispatch hub centre. These lived in config/stripeDashboard.ts
 *  alongside the Stripe dashboard URLs, which had nothing to do with maps; that file is
 *  gone with the rest of the Stripe code, so they live here now. */

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Google Maps directions to a lat/lng destination. */
export function googleMapsDestinationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** OpenStreetMap pin / marker deep link. */
export function openStreetMapMarkerUrl(lat: number, lng: number, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

export function openStreetMapEmbedUrl(lat: number, lng: number, zoom = 11): string {
  const delta = 0.08 / (zoom / 10);
  const minLon = lng - delta;
  const maxLon = lng + delta;
  const minLat = lat - delta * 0.7;
  const maxLat = lat + delta * 0.7;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Adaptivity Justin hub — fallback map center when jobs have no GPS yet. */
export const DISPATCH_HUB = { lat: 33.0848, lng: -97.2961, label: 'Adaptivity Justin hub' };
