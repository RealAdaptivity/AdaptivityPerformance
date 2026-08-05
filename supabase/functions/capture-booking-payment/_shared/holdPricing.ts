/** Server-side quote hold rules (keep in sync with src/services/holdPricing.ts). Auto-synced. */

export const DIAGNOSTIC_HOLD_DOLLARS = 85;

type ServiceKind = string;

type CatalogService = {
  id: string;
  title: string;
  price: number;
  kind: ServiceKind;
  directBook: boolean;
};

const DIRECT_BOOK_KINDS: ServiceKind[] = [];

const SERVICE_CATALOG: CatalogService[] = [
  {
    "id": "diagnostic",
    "title": "Mobile Diagnostic Visit",
    "price": 100,
    "kind": "diagnostic",
    "directBook": false
  },
  {
    "id": "oil_change",
    "title": "Full Synthetic Mobile Oil Change",
    "price": 100,
    "kind": "oil_change",
    "directBook": false
  },
  {
    "id": "brakes",
    "title": "Brake Service (Pads / Rotors)",
    "price": 100,
    "kind": "brakes",
    "directBook": false
  },
  {
    "id": "transmission_oil",
    "title": "Transmission Fluid Service",
    "price": 100,
    "kind": "transmission_oil",
    "directBook": false
  },
  {
    "id": "differential",
    "title": "Differential Fluid Service",
    "price": 100,
    "kind": "differential",
    "directBook": false
  },
  {
    "id": "battery",
    "title": "Battery / Charging System",
    "price": 100,
    "kind": "battery",
    "directBook": false
  },
  {
    "id": "ac_service",
    "title": "A/C & Climate Service",
    "price": 100,
    "kind": "ac_service",
    "directBook": false
  },
  {
    "id": "suspension",
    "title": "Suspension & Ride Control",
    "price": 100,
    "kind": "suspension",
    "directBook": false
  },
  {
    "id": "exhaust_repair",
    "title": "Exhaust Repair",
    "price": 100,
    "kind": "exhaust_repair",
    "directBook": false
  },
  {
    "id": "cooling_system",
    "title": "Cooling System / Overheating",
    "price": 100,
    "kind": "cooling_system",
    "directBook": false
  },
  {
    "id": "belts_hoses",
    "title": "Belts & Hoses",
    "price": 100,
    "kind": "belts_hoses",
    "directBook": false
  },
  {
    "id": "ignition",
    "title": "Ignition / Spark Plugs",
    "price": 100,
    "kind": "ignition",
    "directBook": false
  },
  {
    "id": "fuel_system",
    "title": "Fuel System Service",
    "price": 100,
    "kind": "fuel_system",
    "directBook": false
  },
  {
    "id": "tires",
    "title": "Tires — Mount / Balance / Flat",
    "price": 100,
    "kind": "tires",
    "directBook": false
  },
  {
    "id": "wheel_service",
    "title": "Wheels & Alignment Concern",
    "price": 100,
    "kind": "wheel_service",
    "directBook": false
  },
  {
    "id": "auto_glass",
    "title": "Auto Glass / Windshield",
    "price": 100,
    "kind": "auto_glass",
    "directBook": false
  },
  {
    "id": "car_audio",
    "title": "Car Audio Install / Upgrade",
    "price": 100,
    "kind": "car_audio",
    "directBook": false
  },
  {
    "id": "window_tint",
    "title": "Window Tint",
    "price": 100,
    "kind": "window_tint",
    "directBook": false
  },
  {
    "id": "vehicle_wrap",
    "title": "Vehicle Wrap",
    "price": 100,
    "kind": "vehicle_wrap",
    "directBook": false
  },
  {
    "id": "ppf",
    "title": "Paint Protection Film (PPF)",
    "price": 100,
    "kind": "ppf",
    "directBook": false
  },
  {
    "id": "body_work",
    "title": "Body Work / Dent Repair",
    "price": 100,
    "kind": "body_work",
    "directBook": false
  },
  {
    "id": "interior_lighting",
    "title": "Interior Lighting Upgrade",
    "price": 100,
    "kind": "interior_lighting",
    "directBook": false
  },
  {
    "id": "interior_color",
    "title": "Interior Color Change",
    "price": 100,
    "kind": "interior_color",
    "directBook": false
  },
  {
    "id": "accessories",
    "title": "Accessories & Custom Install",
    "price": 100,
    "kind": "accessories",
    "directBook": false
  },
  {
    "id": "mobile_detailing",
    "title": "Mobile Detailing",
    "price": 100,
    "kind": "mobile_detailing",
    "directBook": false
  },
  {
    "id": "ceramic_coating",
    "title": "Ceramic Coating",
    "price": 100,
    "kind": "ceramic_coating",
    "directBook": false
  },
  {
    "id": "paint_correction",
    "title": "Paint Correction",
    "price": 100,
    "kind": "paint_correction",
    "directBook": false
  },
  {
    "id": "headlight_restore",
    "title": "Headlight Restoration",
    "price": 100,
    "kind": "headlight_restore",
    "directBook": false
  },
  {
    "id": "performance_tune",
    "title": "Performance Tune / Calibration",
    "price": 100,
    "kind": "performance_tune",
    "directBook": false
  },
  {
    "id": "intake_exhaust_upgrade",
    "title": "Intake / Exhaust Upgrade",
    "price": 100,
    "kind": "intake_exhaust_upgrade",
    "directBook": false
  }
];

function getById(id: string) {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

function matchFromLabel(label: string): CatalogService | undefined {
  const t = label.toLowerCase();
  if (/\b(brake|brakes|pads|rotors)\b/.test(t)) return getById('brakes');
  if (/\b(transmission|trans)\b/.test(t) && /\b(oil|fluid)\b/.test(t)) return getById('transmission_oil');
  if (/\bdifferential|diff\b/.test(t) && /\b(oil|fluid|change|service)\b/.test(t)) return getById('differential');
  if (/\b(battery|alternator|starter|jump\s*start|charging\s*system)\b/.test(t)) return getById('battery');
  if (/\b(a\/?c|air\s*condition|climate|freon|refrigerant)\b/.test(t)) return getById('ac_service');
  if (/\b(suspension|shock|strut|alignment|bushing)\b/.test(t)) return getById('suspension');
  if (/\b(exhaust|muffler|catalytic)\b/.test(t) && !/\b(upgrade|performance|intake)\b/.test(t)) return getById('exhaust_repair');
  if (/\b(coolant|radiator|overheat|thermostat|water\s*pump)\b/.test(t)) return getById('cooling_system');
  if (/\b(belt|serpentine|hose|tensioner)\b/.test(t)) return getById('belts_hoses');
  if (/\b(spark\s*plug|ignition|coil|misfire)\b/.test(t)) return getById('ignition');
  if (/\b(fuel\s*(system|filter|pump|injector)|injectors)\b/.test(t)) return getById('fuel_system');
  if (/\b(tire|tyre|flat|puncture|tpms|mount|balance|rotation)\b/.test(t)) return getById('tires');
  if (/\b(wheel|rim|curb\s*rash)\b/.test(t)) return getById('wheel_service');
  if (/\b(windshield|windscreen|auto\s*glass|chip\s*repair|glass)\b/.test(t)) return getById('auto_glass');
  if (/\b(tint|window\s*tint|ceramic\s*tint)\b/.test(t)) return getById('window_tint');
  if (/\b(ppf|paint\s*protection|clear\s*bra)\b/.test(t)) return getById('ppf');
  if (/\b(interior\s*light|ambient\s*light|footwell|cabin\s*light|led\s*interior)\b/.test(t)) return getById('interior_lighting');
  if (/\b(interior\s*color|cabin\s*color|dash\s*color|trim\s*color|recolor)\b/.test(t)) return getById('interior_color');
  if (/\b(accessor|remote\s*start|running\s*board|roof\s*rack|backup\s*camera)\b/.test(t)) return getById('accessories');
  if (/\b(ceramic\s*coat)\b/.test(t)) return getById('ceramic_coating');
  if (/\b(paint\s*correction|swirl|polish)\b/.test(t)) return getById('paint_correction');
  if (/\b(headlight\s*restor|headlamp\s*restor)\b/.test(t)) return getById('headlight_restore');
  if (/\b(detail|detailing|mobile\s*detail|wash\s*and\s*wax)\b/.test(t)) return getById('mobile_detailing');
  if (/\b(tune|ecu|calibration|dyno)\b/.test(t)) return getById('performance_tune');
  if (/\b(intake|performance\s*exhaust|cat[\s-]?back)\b/.test(t)) return getById('intake_exhaust_upgrade');
  if (/\b(wrap|vinyl\s*wrap|vehicle\s*wrap)\b/.test(t)) return getById('vehicle_wrap');
  if (/\b(body\s*work|bodywork|dent|dents|collision|paintless|pdr|fender|bumper\s*repair)\b/.test(t)) return getById('body_work');
  if (/\b(audio|stereo|speaker|head\s*unit|subwoofer|car\s*audio)\b/.test(t)) return getById('car_audio');
  if (/\boil\b/.test(t) && !/\btransmission\b/.test(t)) return getById('oil_change');
  if (/\bdiagnostic|dvi|inspection|scan|check\s*engine\b/.test(t)) return getById('diagnostic');
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
        id: `custom_${raw.slice(0, 24)}`,
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
