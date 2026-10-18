/** European vehicles are billed at their own labor rate. No imports, so
 *  tests/europeanRate.test.ts can load it with node.
 *
 *  The rate replaces the old "1.35x European multiplier" the FAQ described:
 *  the owner prices European work at a flat hourly rate instead. */

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

const PATTERN = new RegExp(
  `\\b(${[...EUROPEAN_MAKES.map((m) => m.toLowerCase()), ...ALIASES]
    .map((m) => m.replace(/[-\s]+/g, '[-\\s]?'))
    .join('|')})\\b`,
  'i'
);

/** Whether a vehicle — a decoded make, or a typed "2013 BMW 535i" — is billed
 *  at the European rate. */
export function isEuropeanVehicle(vehicle: string | null | undefined): boolean {
  return PATTERN.test(vehicle ?? '');
}

/** The hourly rate for a vehicle, in cents: the European rate for European
 *  makes, otherwise the shop rate passed in. */
export function laborRateCentsForVehicle(vehicle: string | null | undefined, shopRateCents: number): number {
  return isEuropeanVehicle(vehicle) ? EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS * 100 : shopRateCents;
}
