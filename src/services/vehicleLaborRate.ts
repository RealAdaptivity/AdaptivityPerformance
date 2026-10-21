/** Labor rates that depend on the vehicle: diesels and European makes are
 *  billed at their own hourly rate, everything else at the shop rate. No
 *  imports, so tests/vehicleLaborRate.test.ts can load it with node.
 *
 *  These flat rates replace the old "1.35x European multiplier" and
 *  "heavy-duty labor multiplier" the FAQ described. */

/** Labor on diesels, pickups to 18-wheelers, in dollars per hour. */
export const DIESEL_LABOR_RATE_PER_HOUR_DOLLARS = 200;

/** Labor on European vehicles, in dollars per hour. */
export const EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS = 175;

/** Makes billed at the European rate, as customers and NHTSA write them. */
export const EUROPEAN_MAKES = [
  'Alfa Romeo',
  'Aston Martin',
  'Audi',
  'Bentley',
  'BMW',
  'Ferrari',
  'Fiat',
  'Jaguar',
  'Lamborghini',
  'Land Rover',
  'Lotus',
  'Maserati',
  'McLaren',
  'Mercedes-Benz',
  'Mini',
  'Polestar',
  'Porsche',
  'Rolls-Royce',
  'Saab',
  'Smart',
  'Volkswagen',
  'Volvo',
] as const;

/** Other ways a European make shows up in a typed vehicle ("2015 Merc C300",
 *  "Range Rover Sport", "VW Jetta"). */
const ALIASES = ['mercedes', 'benz', 'vw', 'range rover', 'rolls royce', 'alfa'];

const EUROPEAN_PATTERN = new RegExp(
  `\\b(${[...EUROPEAN_MAKES.map((m) => m.toLowerCase()), ...ALIASES]
    .map((m) => m.replace(/[-\s]+/g, '[-\\s]?'))
    .join('|')})\\b`,
  'i'
);

/** What marks a vehicle as a diesel: the word itself (NHTSA decodes write
 *  "6.7L V8 Diesel"), the diesel engine families, and the makers of semis
 *  and medium-duty trucks, which are diesel. */
const DIESEL_PATTERN = new RegExp(
  [
    'diesel',
    'power[-\\s]?stroke',
    'duramax',
    'cummins',
    'eco[-\\s]?diesel',
    'tdi',
    'bluetec',
    'semi(?:[-\\s]?truck)?',
    '18[-\\s\\u2011]?wheeler',
    'freightliner',
    'peterbilt',
    'kenworth',
    'mack',
    'western star',
    'international',
    'navistar',
    'hino',
    'volvo\\s+v(?:nl|nr|nx|hd|ah)',
    'isuzu\\s+n[pqr]r',
  ]
    .map((p) => `\\b${p}\\b`)
    .join('|'),
  'i'
);

/** Whether a vehicle — a decoded make, or a typed "2013 BMW 535i" — is a
 *  European make. */
export function isEuropeanVehicle(vehicle: string | null | undefined): boolean {
  return EUROPEAN_PATTERN.test(vehicle ?? '');
}

/** Whether a vehicle is a diesel, from a decoded engine ("6.7L V8 Diesel")
 *  or a typed "2018 F-250 Powerstroke" or "2012 Mack Granite". */
export function isDieselVehicle(vehicle: string | null | undefined): boolean {
  return DIESEL_PATTERN.test(vehicle ?? '');
}

export type VehicleLaborRateKind = 'diesel' | 'european' | 'shop';

/** What the customer picks on the booking form ("Vehicle type"). Saved on
 *  the booking as vehicle_class. */
export type VehicleClass = 'regular' | 'european' | 'diesel';

export const VEHICLE_CLASSES: readonly VehicleClass[] = ['regular', 'european', 'diesel'];

export function parseVehicleClass(v: unknown): VehicleClass | null {
  return typeof v === 'string' && (VEHICLE_CLASSES as readonly string[]).includes(v) ? (v as VehicleClass) : null;
}

const KIND_RANK: Record<VehicleLaborRateKind, number> = { shop: 0, european: 1, diesel: 2 };
const CLASS_KIND: Record<VehicleClass, VehicleLaborRateKind> = { regular: 'shop', european: 'european', diesel: 'diesel' };

/** Which rate a vehicle is billed at. A diesel is billed as a diesel even
 *  when it is European (a Volvo semi, a VW TDI): the higher rate wins. The
 *  same goes for what the customer picked on the booking form: picking
 *  Diesel bills as a diesel, but picking Regular on a Powerstroke does not
 *  make it one. */
export function laborRateKindForVehicle(
  vehicle: string | null | undefined,
  chosen?: VehicleClass | null
): VehicleLaborRateKind {
  const detected: VehicleLaborRateKind = isDieselVehicle(vehicle)
    ? 'diesel'
    : isEuropeanVehicle(vehicle)
      ? 'european'
      : 'shop';
  const picked = chosen ? CLASS_KIND[chosen] : 'shop';
  return KIND_RANK[picked] > KIND_RANK[detected] ? picked : detected;
}

/** The vehicle type the booking form starts on for what's been typed so far. */
export function suggestedVehicleClass(vehicle: string | null | undefined): VehicleClass {
  const kind = laborRateKindForVehicle(vehicle);
  return kind === 'shop' ? 'regular' : kind;
}

/** The hourly rate for a vehicle, in cents: the diesel or European rate when
 *  it applies, otherwise the shop rate passed in. */
export function laborRateCentsForVehicle(
  vehicle: string | null | undefined,
  shopRateCents: number,
  chosen?: VehicleClass | null
): number {
  switch (laborRateKindForVehicle(vehicle, chosen)) {
    case 'diesel':
      return DIESEL_LABOR_RATE_PER_HOUR_DOLLARS * 100;
    case 'european':
      return EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS * 100;
    default:
      return shopRateCents;
  }
}

/** "Diesel — $200/hr", "European vehicle — $175/hr", or null at the shop rate. */
export function vehicleLaborRateLabel(vehicle: string | null | undefined, chosen?: VehicleClass | null): string | null {
  switch (laborRateKindForVehicle(vehicle, chosen)) {
    case 'diesel':
      return `Diesel — $${DIESEL_LABOR_RATE_PER_HOUR_DOLLARS}/hr`;
    case 'european':
      return `European vehicle — $${EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS}/hr`;
    default:
      return null;
  }
}
