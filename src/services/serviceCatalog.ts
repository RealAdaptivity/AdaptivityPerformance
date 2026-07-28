/** Bookable services + quote hold rules (mirrored in customer app + edge holdPricing). */

export type ServiceKind =
  | 'diagnostic'
  | 'oil_change'
  | 'brakes'
  | 'transmission_oil'
  | 'differential'
  | 'battery'
  | 'ac_service'
  | 'suspension'
  | 'exhaust_repair'
  | 'cooling_system'
  | 'belts_hoses'
  | 'ignition'
  | 'fuel_system'
  | 'car_audio'
  | 'window_tint'
  | 'vehicle_wrap'
  | 'ppf'
  | 'body_work'
  | 'interior_lighting'
  | 'interior_color'
  | 'accessories'
  | 'mobile_detailing'
  | 'ceramic_coating'
  | 'paint_correction'
  | 'headlight_restore'
  | 'tires'
  | 'wheel_service'
  | 'auto_glass'
  | 'performance_tune'
  | 'intake_exhaust_upgrade'
  | 'other';

export type CatalogService = {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
  kind: ServiceKind;
  /** Always false — all bookings use $100 diagnostic hold; tech sets price on site. */
  directBook: boolean;
  /** Illustrative labor+parts ballpark (not a final bill). */
  typicalMinDollars?: number;
  typicalMaxDollars?: number;
};

/** Legacy list (empty): all services use diagnostic hold + tech-set pricing. */
export const DIRECT_BOOK_KINDS: ServiceKind[] = [];

export const DIAGNOSTIC_HOLD_DOLLARS = 100;

function consult(
  id: string,
  title: string,
  description: string,
  icon: string,
  kind: ServiceKind,
  duration = '45–60 mins consult',
  typicalMinDollars?: number,
  typicalMaxDollars?: number
): CatalogService {
  return {
    id,
    title,
    description,
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration,
    icon,
    kind,
    directBook: false,
    typicalMinDollars,
    typicalMaxDollars,
  };
}

export function formatCatalogPriceRange(s: Pick<CatalogService, 'typicalMinDollars' | 'typicalMaxDollars'>): string | null {
  if (s.typicalMinDollars == null || s.typicalMaxDollars == null) return null;
  return `Typically $${s.typicalMinDollars}–$${s.typicalMaxDollars}`;
}

export const SERVICE_CATALOG: CatalogService[] = [
  {
    id: 'diagnostic',
    title: 'Mobile Diagnostic Visit',
    description:
      '$100 diagnostic hold. Tech inspects on site and sets labor + parts pricing before any repair charge.',
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration: '45–60 mins',
    icon: '🔍',
    kind: 'diagnostic',
    directBook: false,
    typicalMinDollars: 100,
    typicalMaxDollars: 100,
  },
  {
    id: 'oil_change',
    title: 'Full Synthetic Mobile Oil Change',
    description:
      'Euro synthetic oil + OEM filter + multi-point check. Final price set by your tech on site.',
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration: '45 mins+',
    icon: '🛢️',
    kind: 'oil_change',
    directBook: false,
    typicalMinDollars: 89,
    typicalMaxDollars: 160,
  },
  {
    id: 'brakes',
    title: 'Brake Service (Pads / Rotors)',
    description:
      'Pads, rotors, sensors as needed. Tech diagnoses wear on site and sets labor + parts pricing.',
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration: '1–3 hrs',
    icon: '🛑',
    kind: 'brakes',
    directBook: false,
    typicalMinDollars: 280,
    typicalMaxDollars: 650,
  },
  {
    id: 'transmission_oil',
    title: 'Transmission Fluid Service',
    description: 'Fluid service — final price set by your tech on site after confirming fluid type.',
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration: '1–2 hrs',
    icon: '⚙️',
    kind: 'transmission_oil',
    directBook: false,
    typicalMinDollars: 180,
    typicalMaxDollars: 350,
  },
  {
    id: 'differential',
    title: 'Differential Fluid Service',
    description: 'Diff fluid service — final price set by tech on site.',
    price: DIAGNOSTIC_HOLD_DOLLARS,
    duration: '1–2 hrs',
    icon: '🔧',
    kind: 'differential',
    directBook: false,
    typicalMinDollars: 140,
    typicalMaxDollars: 280,
  },
  consult(
    'battery',
    'Battery / Charging System',
    '$100 on-site test. Mechanical tech diagnoses battery, alternator, or starter issues and quotes before parts/install.',
    '🔋',
    'battery',
    '30–45 mins',
    180,
    420
  ),
  consult(
    'ac_service',
    'A/C & Climate Service',
    '$100 on-site A/C assessment. Diagnose cooling, recharge needs, or HVAC issues before repair charge.',
    '❄️',
    'ac_service',
    '45–60 mins consult',
    150,
    450
  ),
  consult(
    'suspension',
    'Suspension & Ride Control',
    '$100 on-site inspection. Shocks, struts, bushings, or alignment concerns quoted after assessment.',
    '🛣️',
    'suspension',
    '45–60 mins consult',
    250,
    900
  ),
  consult(
    'exhaust_repair',
    'Exhaust Repair',
    '$100 on-site inspection. Mufflers, pipes, catalytic issues, and leaks assessed before repair quote.',
    '💨',
    'exhaust_repair',
    '45–60 mins consult',
    200,
    800
  ),
  consult(
    'cooling_system',
    'Cooling System / Overheating',
    '$100 on-site cooling check. Radiator, thermostat, water pump, and leak concerns quoted after inspection.',
    '🌡️',
    'cooling_system',
    '45–60 mins consult',
    180,
    700
  ),
  consult(
    'belts_hoses',
    'Belts & Hoses',
    '$100 on-site inspection. Serpentine belts, tensioners, and hose replacements quoted before work.',
    '🔗',
    'belts_hoses',
    '30–45 mins',
    120,
    350
  ),
  consult(
    'ignition',
    'Ignition / Spark Plugs',
    '$100 on-site assessment. Misfires, plugs, coils, and ignition issues quoted before repair.',
    '⚡',
    'ignition',
    '45–60 mins consult',
    150,
    480
  ),
  consult(
    'fuel_system',
    'Fuel System Service',
    '$100 on-site assessment. Fuel filters, injectors, pumps, and related concerns quoted after inspection.',
    '⛽',
    'fuel_system',
    '45–60 mins consult',
    200,
    650
  ),
  consult(
    'tires',
    'Tires — Mount / Balance / Flat',
    '$100 on-site tire service consult. Mount, balance, rotation, puncture repair, or TPMS quoted before work.',
    '🛞',
    'tires',
    '30–60 mins',
    40,
    200
  ),
  consult(
    'wheel_service',
    'Wheels & Alignment Concern',
    '$100 on-site wheel/alignment assessment. Vibration, curb rash, or alignment needs quoted before service.',
    '⭕',
    'wheel_service',
    '45–60 mins consult',
    100,
    350
  ),
  consult(
    'auto_glass',
    'Auto Glass / Windshield',
    '$100 on-site glass assessment. Chip repair or windshield / side glass replacement quoted before work.',
    '🪟',
    'auto_glass',
    '30–45 mins',
    80,
    450
  ),
  consult(
    'car_audio',
    'Car Audio Install / Upgrade',
    '$100 on-site consult. Speakers, head unit, amp, or full system quoted before install.',
    '🔊',
    'car_audio',
    '45–90 mins consult',
    200,
    1500
  ),
  consult(
    'window_tint',
    'Window Tint',
    '$100 on-site measure. Tint film options quoted and installed after you approve.',
    '🕶️',
    'window_tint',
    '30–45 mins measure'
  ),
  consult(
    'vehicle_wrap',
    'Vehicle Wrap',
    '$100 on-site consult. Full or partial vinyl wrap options quoted before film work.',
    '🎨',
    'vehicle_wrap'
  ),
  consult(
    'ppf',
    'Paint Protection Film (PPF)',
    '$100 on-site consult. Clear bra / PPF coverage areas quoted before install.',
    '🛡️',
    'ppf'
  ),
  consult(
    'body_work',
    'Body Work / Dent Repair',
    '$100 on-site assessment. Dents, panels, or cosmetic damage quoted before body work charge.',
    '🚗',
    'body_work'
  ),
  consult(
    'interior_lighting',
    'Interior Lighting Upgrade',
    '$100 on-site consult. Ambient LED, footwell, dome, or custom interior lighting quoted before install.',
    '💡',
    'interior_lighting',
    '30–60 mins consult'
  ),
  consult(
    'interior_color',
    'Interior Color Change',
    '$100 on-site consult. Dash, trim, or cabin color refresh options quoted before work.',
    '✨',
    'interior_color'
  ),
  consult(
    'accessories',
    'Accessories & Custom Install',
    '$100 on-site consult. Running boards, racks, cameras, remote start, or other accessories quoted before install.',
    '🧰',
    'accessories'
  ),
  consult(
    'mobile_detailing',
    'Mobile Detailing',
    '$100 on-site consult. Interior, exterior, or full mobile detail packages quoted before service.',
    '🧽',
    'mobile_detailing',
    '30–45 mins consult'
  ),
  consult(
    'ceramic_coating',
    'Ceramic Coating',
    '$100 on-site paint assessment. Ceramic coating packages quoted before application.',
    '💎',
    'ceramic_coating'
  ),
  consult(
    'paint_correction',
    'Paint Correction',
    '$100 on-site paint inspection. Swirl / scratch correction scope quoted before polish work.',
    '✨',
    'paint_correction'
  ),
  consult(
    'headlight_restore',
    'Headlight Restoration',
    '$100 on-site check. Cloudy / yellowed headlight restore quoted before service.',
    '💡',
    'headlight_restore',
    '30–45 mins'
  ),
  consult(
    'performance_tune',
    'Performance Tune / Calibration',
    '$100 on-site consult. ECU tune, calibration, or performance programming quoted before work.',
    '🏎️',
    'performance_tune'
  ),
  consult(
    'intake_exhaust_upgrade',
    'Intake / Exhaust Upgrade',
    '$100 on-site consult. Performance intake or exhaust upgrades quoted before install.',
    '🔥',
    'intake_exhaust_upgrade'
  ),
];

export function getCatalogById(id: string): CatalogService | undefined {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

export function matchCatalogFromLabel(label: string): CatalogService | undefined {
  const t = label.toLowerCase();
  if (/\b(brake|brakes|pads|rotors)\b/.test(t)) return getCatalogById('brakes');
  if (/\b(transmission|trans)\b/.test(t) && /\b(oil|fluid)\b/.test(t)) {
    return getCatalogById('transmission_oil');
  }
  if (/\bdifferential|diff\b/.test(t) && /\b(oil|fluid|change|service)\b/.test(t)) {
    return getCatalogById('differential');
  }
  if (/\b(battery|alternator|starter|jump\s*start|charging\s*system)\b/.test(t)) {
    return getCatalogById('battery');
  }
  if (/\b(a\/?c|air\s*condition|climate|freon|refrigerant)\b/.test(t)) {
    return getCatalogById('ac_service');
  }
  if (/\b(suspension|shock|strut|alignment|bushing)\b/.test(t)) {
    return getCatalogById('suspension');
  }
  if (/\b(exhaust|muffler|catalytic)\b/.test(t) && !/\b(upgrade|performance|intake)\b/.test(t)) {
    return getCatalogById('exhaust_repair');
  }
  if (/\b(coolant|radiator|overheat|thermostat|water\s*pump)\b/.test(t)) {
    return getCatalogById('cooling_system');
  }
  if (/\b(belt|serpentine|hose|tensioner)\b/.test(t)) return getCatalogById('belts_hoses');
  if (/\b(spark\s*plug|ignition|coil|misfire)\b/.test(t)) return getCatalogById('ignition');
  if (/\b(fuel\s*(system|filter|pump|injector)|injectors)\b/.test(t)) {
    return getCatalogById('fuel_system');
  }
  if (/\b(tire|tyre|flat|puncture|tpms|mount|balance|rotation)\b/.test(t)) {
    return getCatalogById('tires');
  }
  if (/\b(wheel|rim|curb\s*rash)\b/.test(t)) return getCatalogById('wheel_service');
  if (/\b(windshield|windscreen|auto\s*glass|chip\s*repair|glass)\b/.test(t)) {
    return getCatalogById('auto_glass');
  }
  if (/\b(tint|window\s*tint|ceramic\s*tint)\b/.test(t)) return getCatalogById('window_tint');
  if (/\b(ppf|paint\s*protection|clear\s*bra)\b/.test(t)) return getCatalogById('ppf');
  if (/\b(interior\s*light|ambient\s*light|footwell|cabin\s*light|led\s*interior)\b/.test(t)) {
    return getCatalogById('interior_lighting');
  }
  if (/\b(interior\s*color|cabin\s*color|dash\s*color|trim\s*color|recolor)\b/.test(t)) {
    return getCatalogById('interior_color');
  }
  if (/\b(accessor|remote\s*start|running\s*board|roof\s*rack|backup\s*camera)\b/.test(t)) {
    return getCatalogById('accessories');
  }
  if (/\b(ceramic\s*coat)\b/.test(t)) return getCatalogById('ceramic_coating');
  if (/\b(paint\s*correction|swirl|polish)\b/.test(t)) return getCatalogById('paint_correction');
  if (/\b(headlight\s*restor|headlamp\s*restor)\b/.test(t)) return getCatalogById('headlight_restore');
  if (/\b(detail|detailing|mobile\s*detail|wash\s*and\s*wax)\b/.test(t)) {
    return getCatalogById('mobile_detailing');
  }
  if (/\b(tune|ecu|calibration|dyno)\b/.test(t)) return getCatalogById('performance_tune');
  if (/\b(intake|performance\s*exhaust|cat[\s-]?back)\b/.test(t)) {
    return getCatalogById('intake_exhaust_upgrade');
  }
  if (/\b(wrap|vinyl\s*wrap|vehicle\s*wrap)\b/.test(t)) return getCatalogById('vehicle_wrap');
  if (/\b(body\s*work|bodywork|dent|dents|collision|paintless|pdr|fender|bumper\s*repair)\b/.test(t)) {
    return getCatalogById('body_work');
  }
  if (/\b(audio|stereo|speaker|head\s*unit|subwoofer|car\s*audio)\b/.test(t)) {
    return getCatalogById('car_audio');
  }
  if (/\boil\b/.test(t) && !/\btransmission\b/.test(t)) return getCatalogById('oil_change');
  if (/\bdiagnostic|dvi|inspection|scan|check\s*engine\b/.test(t)) {
    return getCatalogById('diagnostic');
  }
  return undefined;
}

export type ClaimSpecialty =
  | 'mechanical'
  | 'audio'
  | 'tint'
  | 'wrap'
  | 'bodywork'
  | 'modification'
  | 'detailing'
  | 'tires'
  | 'glass'
  | 'performance';

export function specialtyForServiceKind(kind: ServiceKind): ClaimSpecialty {
  switch (kind) {
    case 'car_audio':
      return 'audio';
    case 'window_tint':
      return 'tint';
    case 'vehicle_wrap':
    case 'ppf':
      return 'wrap';
    case 'body_work':
      return 'bodywork';
    case 'interior_lighting':
    case 'interior_color':
    case 'accessories':
      return 'modification';
    case 'mobile_detailing':
    case 'ceramic_coating':
    case 'paint_correction':
    case 'headlight_restore':
      return 'detailing';
    case 'tires':
    case 'wheel_service':
      return 'tires';
    case 'auto_glass':
      return 'glass';
    case 'performance_tune':
    case 'intake_exhaust_upgrade':
      return 'performance';
    default:
      return 'mechanical';
  }
}

export function specialtiesNeededForServices(services: string[]): ClaimSpecialty[] {
  const needed = new Set<ClaimSpecialty>();
  for (const raw of services) {
    const match = getCatalogById(raw) || matchCatalogFromLabel(raw);
    needed.add(specialtyForServiceKind(match?.kind || 'other'));
  }
  if (needed.size === 0) needed.add('mechanical');
  return [...needed];
}

export function techCanClaimServices(techSpecialties: string[], jobServices: string[]): boolean {
  const has = new Set(techSpecialties.length ? techSpecialties : ['mechanical']);
  return specialtiesNeededForServices(jobServices).every((s) => has.has(s));
}
