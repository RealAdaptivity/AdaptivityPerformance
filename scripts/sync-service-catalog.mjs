/**
 * Syncs compact holdPricing + customer serviceCatalog from performance catalog.
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

const consultFn = `
const DIAGNOSTIC_HOLD_DOLLARS = 100;
function consult(id, title, description, icon, kind, duration = '45–60 mins consult', typicalMinDollars, typicalMaxDollars) {
  return {
    id, title, description, price: DIAGNOSTIC_HOLD_DOLLARS, duration, icon, kind, directBook: false,
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
  .replace(/function consult\([\s\S]*?\n\}/, '')
  .replace(/const DIAGNOSTIC_HOLD_DOLLARS[\s\S]*?;/, '')
  .replace(/function formatCatalogPriceRange[\s\S]*?\n\}/, '');

const tmp = path.join(root, 'scripts', '.tmp-catalog.mjs');
fs.writeFileSync(tmp, block + '\nexport { DIAGNOSTIC_HOLD_DOLLARS, DIRECT_BOOK_KINDS, SERVICE_CATALOG };\n');

const mod = await import(pathToFileURL(tmp).href + '?t=' + Date.now());
const { DIAGNOSTIC_HOLD_DOLLARS, DIRECT_BOOK_KINDS, SERVICE_CATALOG } = mod;

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

// Edge holdPricing compact catalog
const compact = SERVICE_CATALOG.map((s) => ({
  id: s.id,
  title: s.title,
  price: s.price,
  kind: s.kind,
  directBook: s.directBook,
}));

const edgePath = path.join(root, 'supabase', 'functions', '_shared', 'holdPricing.ts');
const edge = `/** Server-side quote hold rules (keep in sync with src/services/holdPricing.ts). Auto-synced. */

export const DIAGNOSTIC_HOLD_DOLLARS = ${DIAGNOSTIC_HOLD_DOLLARS};

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
        price: DIAGNOSTIC_HOLD_DOLLARS,
        kind: 'other',
        directBook: false,
      });
    }
  }
  return out;
}

export type ServerHoldQuote = {
  holdDollars: number;
  mode: 'diagnostic' | 'direct';
  serviceTitles: string[];
};

export function computeHoldFromServices(services: unknown): ServerHoldQuote {
  const labels = Array.isArray(services)
    ? services.map((s) => String(s)).filter((s) => s.trim())
    : [];
  const resolved = resolveServices(labels);
  if (resolved.length === 0) {
    return {
      holdDollars: DIAGNOSTIC_HOLD_DOLLARS,
      mode: 'diagnostic',
      serviceTitles: ['Mobile Diagnostic Visit'],
    };
  }

  const allDirect = resolved.every((s) => DIRECT_BOOK_KINDS.includes(s.kind) && s.directBook);
  if (allDirect) {
    return {
      holdDollars: resolved.reduce((sum, s) => sum + s.price, 0),
      mode: 'direct',
      serviceTitles: resolved.map((s) => s.title),
    };
  }

  return {
    holdDollars: DIAGNOSTIC_HOLD_DOLLARS,
    mode: 'diagnostic',
    serviceTitles: resolved.map((s) => s.title),
  };
}
`;
fs.writeFileSync(edgePath, edge);

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

export const DIAGNOSTIC_HOLD_DOLLARS = ${DIAGNOSTIC_HOLD_DOLLARS};

export const SERVICE_CATALOG: CatalogService[] = ${JSON.stringify(customerCatalog, null, 2)};

export function getCatalogById(id: string): CatalogService | undefined {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

${matchFn}
`;

fs.writeFileSync(customerPath, customer);
fs.unlinkSync(tmp);

console.log(`Synced ${SERVICE_CATALOG.length} services → edge holdPricing + customer catalog`);
