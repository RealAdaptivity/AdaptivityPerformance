/**
 * Syncs compact servicePricing + customer serviceCatalog from performance catalog.
 * Run: node scripts/sync-service-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

// Load catalog by transpiling-ish: evaluate the data section via temporary .mjs
const root = process.cwd();
const srcPath = path.join(root, 'src', 'services', 'serviceCatalog.ts');
const src = fs.readFileSync(srcPath, 'utf8');

const start = src.indexOf('export const DIRECT_BOOK_KINDS');
const end = src.indexOf('export function getCatalogById');
if (start < 0 || end < 0) throw new Error('Could not locate catalog block');

/* Read the real value rather than restating it. This script used to strip the
   source constant and prepend its own hardcoded 100, so the generated server
   file could silently disagree with src/services/serviceCatalog.ts — and did:
   the source said 85 while this said 100. */
const holdMatch = src.match(/export const DIAGNOSTIC_FEE_DOLLARS\s*=\s*(\d+)\s*;/);
if (!holdMatch) throw new Error('Could not read DIAGNOSTIC_FEE_DOLLARS from serviceCatalog.ts');
const SOURCE_HOLD_DOLLARS = Number(holdMatch[1]);

const consultFn = `
const DIAGNOSTIC_FEE_DOLLARS = ${SOURCE_HOLD_DOLLARS};
function consult(id, title, description, icon, kind, duration = '45–60 mins consult', typicalMinDollars, typicalMaxDollars) {
  return {
    id, title, description, price: DIAGNOSTIC_FEE_DOLLARS, duration, icon, kind, directBook: false,
    ...(typicalMinDollars != null && typicalMaxDollars != null
      ? { typicalMinDollars, typicalMaxDollars }
      : {}),
  };
}
`;

const block = consultFn + src
  .slice(start, end)
  .replace(/export /g, '')
  .replace(/: ServiceKind\[\]/g, '')
  .replace(/: CatalogService\[\]/g, '')
  .replace(/: CatalogService/g, '')
  .replace(/: ServiceKind/g, '')
  /* Return-type annotations: the list above only covered parameter types, so
     `function isServiceAvailable(kind): boolean {` reached Node as-is and this
     whole script died on it. It has been unrunnable, which is why the generated
     server file drifted from the source. Requiring a `)` before the colon keeps
     this to function signatures. */
  .replace(/\)\s*:\s*[A-Za-z_][\w<>'|[\]. ]*\s*\{/g, ') {')
  .replace(/function consult\([\s\S]*?\n\}/, '')
  .replace(/const DIAGNOSTIC_FEE_DOLLARS[\s\S]*?;/, '')
  .replace(/function formatCatalogPriceRange[\s\S]*?\n\}/, '');

const tmp = path.join(root, 'scripts', '.tmp-catalog.mjs');
fs.writeFileSync(tmp, block + '\nexport { DIAGNOSTIC_FEE_DOLLARS, DIRECT_BOOK_KINDS, SERVICE_CATALOG };\n');

const mod = await import(pathToFileURL(tmp).href + '?t=' + Date.now());
const { DIAGNOSTIC_FEE_DOLLARS, DIRECT_BOOK_KINDS, SERVICE_CATALOG } = mod;

const kindToCategory = {
  diagnostic: 'inspection',
  oil_change: 'maintenance',
  brakes: 'brakes',
  transmission_oil: 'fluids',
  differential: 'fluids',
  battery: 'maintenance',
  ac_service: 'maintenance',
  suspension: 'maintenance',
  exhaust_repair: 'maintenance',
  cooling_system: 'maintenance',
  belts_hoses: 'maintenance',
  ignition: 'maintenance',
  fuel_system: 'maintenance',
  car_audio: 'audio',
  window_tint: 'appearance',
  vehicle_wrap: 'appearance',
  ppf: 'appearance',
  body_work: 'body',
  interior_lighting: 'modification',
  interior_color: 'modification',
  accessories: 'modification',
  mobile_detailing: 'detailing',
  ceramic_coating: 'detailing',
  paint_correction: 'detailing',
  headlight_restore: 'detailing',
  tires: 'tires',
  wheel_service: 'tires',
  auto_glass: 'glass',
  performance_tune: 'performance',
  intake_exhaust_upgrade: 'performance',
  other: 'inspection',
};

// Edge servicePricing compact catalog
const compact = SERVICE_CATALOG.map((s) => ({
  id: s.id,
  title: s.title,
  price: s.price,
  kind: s.kind,
  directBook: s.directBook,
}));

/* Functions that bundle their own nested _shared copy import THAT one, not the
   top-level file. Writing only the top-level copy left
   capture-booking-payment/_shared/servicePricing.ts stale — it still said 85 after
   the source moved to 100, so the function that captures money would have used
   the old hold. Every copy gets written. */
const edgePaths = [
  path.join(root, 'supabase', 'functions', '_shared', 'servicePricing.ts'),
  ...fs
    .readdirSync(path.join(root, 'supabase', 'functions'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => path.join(root, 'supabase', 'functions', d.name, '_shared', 'servicePricing.ts'))
    .filter((p) => fs.existsSync(p)),
];
const edge = `/** Server-side service pricing (keep in sync with src/services/servicePricing.ts). Auto-synced. */

export const DIAGNOSTIC_FEE_DOLLARS = ${DIAGNOSTIC_FEE_DOLLARS};

type ServiceKind = string;

type CatalogService = {
  id: string;
  title: string;
  price: number;
  kind: ServiceKind;
  directBook: boolean;
};

const DIRECT_BOOK_KINDS: ServiceKind[] = ${JSON.stringify(DIRECT_BOOK_KINDS, null, 2)};

const SERVICE_CATALOG: CatalogService[] = ${JSON.stringify(compact, null, 2)};

function getById(id: string) {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

function matchFromLabel(label: string): CatalogService | undefined {
  const t = label.toLowerCase();
  if (/\\b(brake|brakes|pads|rotors)\\b/.test(t)) return getById('brakes');
  if (/\\b(transmission|trans)\\b/.test(t) && /\\b(oil|fluid)\\b/.test(t)) return getById('transmission_oil');
  if (/\\bdifferential|diff\\b/.test(t) && /\\b(oil|fluid|change|service)\\b/.test(t)) return getById('differential');
  if (/\\b(battery|alternator|starter|jump\\s*start|charging\\s*system)\\b/.test(t)) return getById('battery');
  if (/\\b(a\\/?c|air\\s*condition|climate|freon|refrigerant)\\b/.test(t)) return getById('ac_service');
  if (/\\b(suspension|shock|strut|alignment|bushing)\\b/.test(t)) return getById('suspension');
  if (/\\b(exhaust|muffler|catalytic)\\b/.test(t) && !/\\b(upgrade|performance|intake)\\b/.test(t)) return getById('exhaust_repair');
  if (/\\b(coolant|radiator|overheat|thermostat|water\\s*pump)\\b/.test(t)) return getById('cooling_system');
  if (/\\b(belt|serpentine|hose|tensioner)\\b/.test(t)) return getById('belts_hoses');
  if (/\\b(spark\\s*plug|ignition|coil|misfire)\\b/.test(t)) return getById('ignition');
  if (/\\b(fuel\\s*(system|filter|pump|injector)|injectors)\\b/.test(t)) return getById('fuel_system');
  if (/\\b(tire|tyre|flat|puncture|tpms|mount|balance|rotation)\\b/.test(t)) return getById('tires');
  if (/\\b(wheel|rim|curb\\s*rash)\\b/.test(t)) return getById('wheel_service');
  if (/\\b(windshield|windscreen|auto\\s*glass|chip\\s*repair|glass)\\b/.test(t)) return getById('auto_glass');
  if (/\\b(tint|window\\s*tint|ceramic\\s*tint)\\b/.test(t)) return getById('window_tint');
  if (/\\b(ppf|paint\\s*protection|clear\\s*bra)\\b/.test(t)) return getById('ppf');
  if (/\\b(interior\\s*light|ambient\\s*light|footwell|cabin\\s*light|led\\s*interior)\\b/.test(t)) return getById('interior_lighting');
  if (/\\b(interior\\s*color|cabin\\s*color|dash\\s*color|trim\\s*color|recolor)\\b/.test(t)) return getById('interior_color');
  if (/\\b(accessor|remote\\s*start|running\\s*board|roof\\s*rack|backup\\s*camera)\\b/.test(t)) return getById('accessories');
  if (/\\b(ceramic\\s*coat)\\b/.test(t)) return getById('ceramic_coating');
  if (/\\b(paint\\s*correction|swirl|polish)\\b/.test(t)) return getById('paint_correction');
  if (/\\b(headlight\\s*restor|headlamp\\s*restor)\\b/.test(t)) return getById('headlight_restore');
  if (/\\b(detail|detailing|mobile\\s*detail|wash\\s*and\\s*wax)\\b/.test(t)) return getById('mobile_detailing');
  if (/\\b(tune|ecu|calibration|dyno)\\b/.test(t)) return getById('performance_tune');
  if (/\\b(intake|performance\\s*exhaust|cat[\\s-]?back)\\b/.test(t)) return getById('intake_exhaust_upgrade');
  if (/\\b(wrap|vinyl\\s*wrap|vehicle\\s*wrap)\\b/.test(t)) return getById('vehicle_wrap');
  if (/\\b(body\\s*work|bodywork|dent|dents|collision|paintless|pdr|fender|bumper\\s*repair)\\b/.test(t)) return getById('body_work');
  if (/\\b(audio|stereo|speaker|head\\s*unit|subwoofer|car\\s*audio)\\b/.test(t)) return getById('car_audio');
  if (/\\boil\\b/.test(t) && !/\\btransmission\\b/.test(t)) return getById('oil_change');
  if (/\\bdiagnostic|dvi|inspection|scan|check\\s*engine\\b/.test(t)) return getById('diagnostic');
  return undefined;
}

function resolveServices(selected: string[]): CatalogService[] {
  const out: CatalogService[] = [];
  const seen = new Set<string>();
  for (const raw of selected) {
    const match = getById(raw) || matchFromLabel(raw);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      out.push(match);
      continue;
    }
    if (!match && !seen.has(raw)) {
      seen.add(raw);
      out.push({
        id: \`custom_\${raw.slice(0, 24)}\`,
        title: raw,
        price: DIAGNOSTIC_FEE_DOLLARS,
        kind: 'other',
        directBook: false,
      });
    }
  }
  return out;
}

export type ServerServiceQuote = {
  quotedDollars: number;
  mode: 'diagnostic' | 'direct';
  serviceTitles: string[];
};

export function computeQuoteFromServices(services: unknown): ServerServiceQuote {
  const labels = Array.isArray(services)
    ? services.map((s) => String(s)).filter((s) => s.trim())
    : [];
  const resolved = resolveServices(labels);
  if (resolved.length === 0) {
    return {
      quotedDollars: DIAGNOSTIC_FEE_DOLLARS,
      mode: 'diagnostic',
      serviceTitles: ['Mobile Diagnostic Visit'],
    };
  }

  const allDirect = resolved.every((s) => DIRECT_BOOK_KINDS.includes(s.kind) && s.directBook);
  if (allDirect) {
    return {
      quotedDollars: resolved.reduce((sum, s) => sum + s.price, 0),
      mode: 'direct',
      serviceTitles: resolved.map((s) => s.title),
    };
  }

  return {
    quotedDollars: DIAGNOSTIC_FEE_DOLLARS,
    mode: 'diagnostic',
    serviceTitles: resolved.map((s) => s.title),
  };
}
`;
for (const p of edgePaths) fs.writeFileSync(p, edge);
console.log(`wrote ${edgePaths.length} servicePricing copies`);

// Customer app catalog
const customerCatalog = SERVICE_CATALOG.map((s) => ({
  ...s,
  category: kindToCategory[s.kind] || 'inspection',
}));

const kinds = [...new Set(SERVICE_CATALOG.map((s) => s.kind))];
const categories = [...new Set(Object.values(kindToCategory))];

const customerPath = path.join(
  root,
  '..',
  'adaptivity-customer-app',
  'src',
  'lib',
  'serviceCatalog.ts'
);

// Pull matchCatalogFromLabel only (customer app does not need specialty routing helpers)
const matchStart = src.indexOf('export function matchCatalogFromLabel');
const matchEnd = src.indexOf('export type ClaimSpecialty');
const matchFn = (matchEnd > matchStart ? src.slice(matchStart, matchEnd) : src.slice(matchStart))
  .replace('export ', '');

const customer = `/** Bookable services + quote hold rules (keep in sync with adaptivity-performance). Auto-synced. */

export type ServiceKind =
${kinds.map((k) => `  | '${k}'`).join('\n')}
  | 'other';

export type CatalogService = {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
  kind: ServiceKind;
  directBook: boolean;
  category: ${categories.map((c) => `'${c}'`).join(' | ')};
  typicalMinDollars?: number;
  typicalMaxDollars?: number;
};

export function formatCatalogPriceRange(s: Pick<CatalogService, 'typicalMinDollars' | 'typicalMaxDollars'>): string | null {
  if (s.typicalMinDollars == null || s.typicalMaxDollars == null) return null;
  return \`Typically $\${s.typicalMinDollars}–$\${s.typicalMaxDollars}\`;
}

export const DIRECT_BOOK_KINDS: ServiceKind[] = ${JSON.stringify(DIRECT_BOOK_KINDS, null, 2)};

export const DIAGNOSTIC_FEE_DOLLARS = ${DIAGNOSTIC_FEE_DOLLARS};

export const SERVICE_CATALOG: CatalogService[] = ${JSON.stringify(customerCatalog, null, 2)};

export function getCatalogById(id: string): CatalogService | undefined {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

${matchFn}
`;

/* The customer app is a sibling checkout that is not always present — in CI, or
   on a machine that only cloned this repo, it is not. Writing to it was
   unconditional, so the script threw ENOENT after it had already regenerated the
   edge function, leaving the run looking like a failure when the important half
   had succeeded. Skip it when it is not there and say so. */
if (fs.existsSync(path.dirname(customerPath))) {
  fs.writeFileSync(customerPath, customer);
  console.log(`synced customer app -> ${customerPath}`);
} else {
  console.log(`skipped customer app (not checked out at ${path.dirname(customerPath)})`);
}
fs.unlinkSync(tmp);
console.log(`hold = $${SOURCE_HOLD_DOLLARS}; edge + catalog regenerated`);

console.log(`Synced ${SERVICE_CATALOG.length} services → edge servicePricing + customer catalog`);

/* Service-area coverage, same story as the pricing above.
   src/services/serviceArea.ts builds an explicit ZIP allow-list from
   localSeoData.json, precisely because (as its own header says) a 3-digit
   prefix match "would silently pull in Dallas, which is twice as far as we are
   willing to dispatch". The edge copy did exactly that prefix match, on
   750/751/752/760/761/762 — roughly 600 ZIPs, against the 48 actually served,
   with 751 and 752 being Dallas and appearing nowhere in the coverage data.
   The edge function is the authority on whether a booking is accepted, so it
   was accepting mobile work the business does not drive to. Generate it from
   the same source instead. */
{
  const seo = JSON.parse(
    fs.readFileSync(path.join(root, 'src', 'site', 'localSeoData.json'), 'utf8')
  );
  const zips = new Set();
  for (const city of seo.cities || []) {
    for (const z of city.zips || []) zips.add(String(z));
    if (city.zip) zips.add(String(city.zip));
  }
  if (seo.hub?.zip) zips.add(String(seo.hub.zip));
  const sorted = [...zips].sort();
  if (sorted.length === 0) throw new Error('No service ZIPs found in localSeoData.json');

  const areaPath = path.join(root, 'supabase', 'functions', '_shared', 'serviceArea.ts');
  const area = `/** Mobile dispatch coverage. Auto-synced from src/site/localSeoData.json by
 *  scripts/sync-service-catalog.mjs — do not edit by hand.
 *
 *  An explicit allow-list, not a 3-digit prefix match: prefixes 751/752 are
 *  Dallas, twice as far as this business dispatches, and a prefix match
 *  accepted every one of them.
 */

export const COVERED_ZIPS: readonly string[] = ${JSON.stringify(sorted, null, 2)};

const COVERED = new Set<string>(COVERED_ZIPS);

export function normalizeZip(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = input.trim().match(/\\b(\\d{5})\\b/);
  return m ? m[1] : null;
}

export function isCoveredZip(zipCode: string | null | undefined): boolean {
  const zip = normalizeZip(zipCode);
  return !!zip && COVERED.has(zip);
}

export function assertServiceArea(zipCode: string | null | undefined, locationType: string) {
  if (locationType === 'shop') return;
  const zip = normalizeZip(zipCode);
  if (!zip) {
    throw new Error('A valid 5-digit service zip code is required for mobile dispatch.');
  }
  if (!isCoveredZip(zip)) {
    throw new Error(
      \`Mobile service is not available in zip \${zip}. We serve the Justin / north Fort Worth area within 25 miles of our hub. Call (940) 304-0620 for extended-area quotes or book shop service in Justin.\`
    );
  }
}

/** Prefer dedicated zip field; fall back to parsing address line. */
export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}
`;
  fs.writeFileSync(areaPath, area);
  console.log(`Synced ${sorted.length} service ZIPs → edge serviceArea`);
}

