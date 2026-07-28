/**
 * Mobile dispatch coverage: DFW metro with Fort Worth / North Texas focus.
 * Hub for free-radius ETA math remains Justin (76247).
 */

export const SERVICE_HUB = {
  zip: '76247',
  city: 'Justin',
  label: 'Adaptivity Justin hub',
  lat: 33.0848,
  lng: -97.2961,
};

/** 3-digit ZIP prefixes we accept for mobile dispatch. */
export const COVERED_ZIP_PREFIXES = [
  '750', // Plano, Irving, Carrollton, Frisco, etc.
  '751', // Mid-cities / south DFW
  '752', // Dallas
  '760', // Arlington, Mansfield, Grand Prairie, Haslet, etc.
  '761', // Fort Worth
  '762', // Denton, Justin, Northlake, Keller north, Argyle
] as const;

export const FREE_MILES_THRESHOLD = 15;
export const PER_MILE_RATE = 2;

/** Named hubs for ETA preview (everything else in covered prefixes still books). */
export const NAMED_SERVICE_ZIPS: Record<
  string,
  { city: string; area: string; distanceMiles: number; responseTime: string; status: 'Local Radius' | 'Extended Per-Mile' }
> = {
  '76247': {
    city: 'Justin',
    area: 'Downtown Justin, Hardeman, Wildcat Ridge',
    distanceMiles: 3,
    responseTime: '15 - 30 Mins',
    status: 'Local Radius',
  },
  '76226': {
    city: 'Northlake',
    area: 'Canyon Falls, Harvest, Pecan Square',
    distanceMiles: 6,
    responseTime: '15 - 30 Mins',
    status: 'Local Radius',
  },
  '76262': {
    city: 'Roanoke / Northlake',
    area: 'Town Center, Alliance corridor',
    distanceMiles: 11,
    responseTime: '20 - 35 Mins',
    status: 'Local Radius',
  },
  '76227': {
    city: 'Argyle',
    area: 'Village of Argyle, Country Club',
    distanceMiles: 18,
    responseTime: '25 - 40 Mins',
    status: 'Extended Per-Mile',
  },
  '76052': {
    city: 'Haslet',
    area: 'Haslet Town Center, Sendera Ranch',
    distanceMiles: 16,
    responseTime: '20 - 35 Mins',
    status: 'Extended Per-Mile',
  },
  '76177': {
    city: 'Fort Worth (Alliance)',
    area: 'Alliance Town Center / north Fort Worth',
    distanceMiles: 20,
    responseTime: '25 - 40 Mins',
    status: 'Extended Per-Mile',
  },
  '76102': {
    city: 'Fort Worth (Downtown)',
    area: 'Downtown Fort Worth / near southside',
    distanceMiles: 28,
    responseTime: '35 - 55 Mins',
    status: 'Extended Per-Mile',
  },
  '76011': {
    city: 'Arlington',
    area: 'Arlington / Entertainment District',
    distanceMiles: 32,
    responseTime: '40 - 60 Mins',
    status: 'Extended Per-Mile',
  },
  '75034': {
    city: 'Frisco',
    area: 'Frisco / North Dallas corridor',
    distanceMiles: 35,
    responseTime: '40 - 65 Mins',
    status: 'Extended Per-Mile',
  },
  '75201': {
    city: 'Dallas',
    area: 'Downtown Dallas / Uptown',
    distanceMiles: 40,
    responseTime: '45 - 70 Mins',
    status: 'Extended Per-Mile',
  },
  '76201': {
    city: 'Denton',
    area: 'Denton Metro & Loop 288',
    distanceMiles: 22,
    responseTime: '30 - 45 Mins',
    status: 'Extended Per-Mile',
  },
  '76248': {
    city: 'Keller',
    area: 'Keller / Alliance corridor',
    distanceMiles: 24,
    responseTime: '30 - 45 Mins',
    status: 'Extended Per-Mile',
  },
};

export function normalizeZip(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = input.trim().match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

export function isCoveredZip(zipCode: string | null | undefined): boolean {
  const zip = normalizeZip(zipCode);
  if (!zip) return false;
  return COVERED_ZIP_PREFIXES.some((p) => zip.startsWith(p));
}

export function lookupServiceZip(zipCode: string | null | undefined) {
  const zip = normalizeZip(zipCode);
  if (!zip || !isCoveredZip(zip)) return null;
  if (NAMED_SERVICE_ZIPS[zip]) return { zip, ...NAMED_SERVICE_ZIPS[zip] };

  const prefix = zip.slice(0, 3);
  const cityGuess =
    prefix === '761'
      ? 'Fort Worth'
      : prefix === '760'
        ? 'DFW Mid-Cities'
        : prefix === '762'
          ? 'North DFW / Denton County'
          : prefix === '752'
            ? 'Dallas'
            : 'DFW Metro';

  return {
    zip,
    city: cityGuess,
    area: 'Dallas–Fort Worth mobile dispatch coverage',
    distanceMiles: prefix === '762' ? 18 : 30,
    responseTime: prefix === '762' ? '25 - 45 Mins' : '35 - 65 Mins',
    status: (prefix === '762' && Number(zip) <= 76262 ? 'Local Radius' : 'Extended Per-Mile') as
      | 'Local Radius'
      | 'Extended Per-Mile',
  };
}

export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}
