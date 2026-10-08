/**
 * VIN decoding: turning NHTSA's vPIC answer into the fields the booking form
 * and the admin dashboard use.
 *
 * No imports, so the node test runner can load it, and the decode-vin edge
 * function uses an identical copy (supabase/functions/_shared/vinDecode.ts;
 * tests/vinDecode.test.ts keeps them the same). vPIC is free and needs no
 * key, but it sends no CORS headers, so browsers reach it through decode-vin.
 */

/** 17 characters; I, O and Q are never used in a VIN. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export type VinDetail = { label: string; value: string };

export type VinSummary = {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  /** In the booking form's style: "3.5L V6", "2.0L I4 Turbo", "Electric". */
  engine: string;
  /** "2016 Ford F-150 · 3.5L V6" */
  description: string;
  details: VinDetail[];
  /** NHTSA's own caveats: a bad check digit, an uncertain model year. */
  warnings: string[];
  checkDigitOk: boolean;
};

/** Upper case, without spaces or dashes; what the customer meant to type. */
export function normalizeVin(input: string): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isVinShaped(vin: string): boolean {
  return VIN_PATTERN.test(vin);
}

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** The 9th-character check digit used on North American VINs. Vehicles built
 *  for other markets may not follow it, so a mismatch is a warning, not a
 *  rejection. */
export function vinCheckDigitOk(vin: string): boolean {
  if (!isVinShaped(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : TRANSLITERATION[c];
    if (v === undefined) return false;
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return vin[8] === (r === 10 ? 'X' : String(r));
}

const KEEP_UPPER = new Set(['BMW', 'GMC', 'MINI', 'FIAT', 'SRT', 'AMC', 'MG', 'KTM', 'BYD']);

/** "MERCEDES-BENZ" → "Mercedes-Benz", "LAND ROVER" → "Land Rover", "BMW" stays. */
export function titleCaseMake(make: string): string {
  const m = make.trim();
  if (!m) return '';
  if (KEEP_UPPER.has(m.toUpperCase())) return m.toUpperCase();
  return m
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function clean(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === 'Not Applicable' ? '' : s;
}

/** "3.5L V6", "2.0L I4 Turbo", "6.7L V8 Diesel", "Electric". */
export function engineLabel(r: Record<string, unknown>): string {
  const electrification = clean(r.ElectrificationLevel);
  if (/BEV|battery electric/i.test(electrification)) return 'Electric';
  const liters = Number(clean(r.DisplacementL));
  const size = liters > 0 ? `${(Math.round(liters * 10) / 10).toFixed(1)}L` : '';
  const cylinders = Number(clean(r.EngineCylinders)) || 0;
  const config = clean(r.EngineConfiguration);
  const prefix = /V-Shaped/i.test(config)
    ? 'V'
    : /In-Line/i.test(config)
      ? 'I'
      : /Horizontally|boxer/i.test(config)
        ? 'H'
        : /W-Shaped/i.test(config)
          ? 'W'
          : '';
  const layout = cylinders ? (prefix ? `${prefix}${cylinders}` : `${cylinders}-cyl`) : '';
  const turbo = /^yes/i.test(clean(r.Turbo)) ? 'Turbo' : '';
  const hybrid = /PHEV|plug-in/i.test(electrification)
    ? 'Plug-in Hybrid'
    : /HEV|hybrid/i.test(electrification)
      ? 'Hybrid'
      : '';
  const diesel = /diesel/i.test(clean(r.FuelTypePrimary)) ? 'Diesel' : '';
  return [size, layout, turbo, hybrid || diesel].filter(Boolean).join(' ');
}

function cityCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** "2016 Ford F-150 Lariat 3.5L V6": the one-line vehicle a quote stores. */
export function vehicleLine(s: Pick<VinSummary, 'year' | 'make' | 'model' | 'trim' | 'engine'>): string {
  return [s.year, s.make, s.model, s.trim, s.engine].filter(Boolean).join(' ');
}

/**
 * vPIC DecodeVinValues → VinSummary. Null when NHTSA could not tell even the
 * make and year, so the caller can say "we couldn't find that VIN" instead of
 * filling the form with blanks.
 */
export function summarizeVpic(r: Record<string, unknown> | null | undefined, vin: string): VinSummary | null {
  if (!r) return null;
  const year = clean(r.ModelYear);
  const make = titleCaseMake(clean(r.Make));
  if (!year && !make) return null;
  const model = clean(r.Model);
  const trim = clean(r.Trim) || clean(r.Series);
  const engine = engineLabel(r);

  const body = [clean(r.BodyClass), clean(r.BodyCabType)].filter(Boolean).join(' · ');
  const transmission = [clean(r.TransmissionSpeeds) && `${clean(r.TransmissionSpeeds)}-speed`, clean(r.TransmissionStyle)]
    .filter(Boolean)
    .join(' ');
  const plant = [clean(r.PlantCity), clean(r.PlantState), clean(r.PlantCountry).replace(/\s*\(.*\)\s*$/, '')]
    .filter(Boolean)
    .map(cityCase)
    .join(', ');
  const details: VinDetail[] = [
    { label: 'Body', value: body },
    { label: 'Drive', value: clean(r.DriveType) },
    { label: 'Fuel', value: clean(r.FuelTypePrimary) },
    { label: 'Transmission', value: transmission },
    { label: 'Engine code', value: clean(r.EngineModel) },
    { label: 'Horsepower', value: clean(r.EngineHP) ? `${clean(r.EngineHP)} hp` : '' },
    { label: 'Weight class', value: clean(r.GVWR) },
    { label: 'Built in', value: plant },
    { label: 'Manufacturer', value: clean(r.Manufacturer) },
  ].filter((d) => d.value);

  const warnings: string[] = [];
  const codes = clean(r.ErrorCode).split(',').map((c) => c.trim()).filter(Boolean);
  if (codes.some((c) => c !== '0')) {
    const text = clean(r.ErrorText).replace(/^\s*[\d,\s]+-\s*/, '');
    if (text) warnings.push(text);
  }
  const additional = clean(r.AdditionalErrorText);
  if (additional) warnings.push(additional);

  const description = [[year, make, model].filter(Boolean).join(' '), engine].filter(Boolean).join(' · ');
  return {
    vin,
    year,
    make,
    model,
    trim,
    engine,
    description,
    details,
    warnings,
    checkDigitOk: vinCheckDigitOk(vin),
  };
}
