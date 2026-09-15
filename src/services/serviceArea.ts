/**
 * Mobile dispatch coverage: Justin, TX hub with a hard radius (see localSeoData.json).
 *
 * Coverage is an explicit ZIP allow-list derived from `localSeoData.json`, not a
 * 3-digit prefix match — a prefix like `752` would silently pull in Dallas, which
 * is twice as far as we are willing to dispatch.
 */
import { LOCAL_CITIES, LOCAL_HUB } from '../site/localSeo';

export const SERVICE_HUB = {
  zip: LOCAL_HUB.zip,
  city: LOCAL_HUB.city,
  label: `Adaptivity ${LOCAL_HUB.city} hub`,
  lat: LOCAL_HUB.lat,
  lng: LOCAL_HUB.lng,
};

/** Hard outer limit for mobile dispatch, in miles from the Justin hub. */
export const SERVICE_RADIUS_MILES = LOCAL_HUB.radiusMiles;
export const FREE_MILES_THRESHOLD = LOCAL_HUB.freeRadiusMiles;
export const PER_MILE_RATE = 2;

export type ServiceZipInfo = {
  city: string;
  area: string;
  distanceMiles: number;
  responseTime: string;
  status: 'Local Radius' | 'Extended Per-Mile';
};

function responseWindow(driveMinutes: number): string {
  const low = Math.max(15, Math.round((driveMinutes - 5) / 5) * 5);
  const high = low + 20;
  return `${low} - ${high} Mins`;
}

/**
 * ZIP → coverage detail, built from the city catalog. When two cities share a
 * ZIP (76262 covers Roanoke and Trophy Club) the closer one wins, since that is
 * the shorter drive we would actually quote.
 */
export const NAMED_SERVICE_ZIPS: Record<string, ServiceZipInfo> = (() => {
  const table: Record<string, ServiceZipInfo> = {};
  for (const city of LOCAL_CITIES) {
    if (city.distanceMiles > LOCAL_HUB.radiusMiles) continue;
    for (const zip of city.zips) {
      const existing = table[zip];
      if (existing && existing.distanceMiles <= city.distanceMiles) continue;
      table[zip] = {
        city: city.city,
        area: city.neighborhoods,
        distanceMiles: city.distanceMiles,
        responseTime: responseWindow(city.driveMinutes),
        status: city.distanceMiles <= FREE_MILES_THRESHOLD ? 'Local Radius' : 'Extended Per-Mile',
      };
    }
  }
  return table;
})();

/** Every ZIP we dispatch to, sorted for display. */
export const COVERED_ZIPS: string[] = Object.keys(NAMED_SERVICE_ZIPS).sort();

export function normalizeZip(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = input.trim().match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

export function isCoveredZip(zipCode: string | null | undefined): boolean {
  const zip = normalizeZip(zipCode);
  return !!zip && zip in NAMED_SERVICE_ZIPS;
}

export function lookupServiceZip(zipCode: string | null | undefined) {
  const zip = normalizeZip(zipCode);
  if (!zip) return null;
  const info = NAMED_SERVICE_ZIPS[zip];
  return info ? { zip, ...info } : null;
}

export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}

/** Travel fee past the free radius, in dollars. */
export function travelFeeForMiles(distanceMiles: number): number {
  const extra = Math.max(0, distanceMiles - FREE_MILES_THRESHOLD);
  return Math.round(extra * PER_MILE_RATE * 100) / 100;
}
