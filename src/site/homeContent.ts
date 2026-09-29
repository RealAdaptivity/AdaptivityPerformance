/**
 * The homepage's small decisions, kept as plain functions.
 *
 * No imports on purpose: the node test runner cannot follow the site's
 * extensionless imports (serviceArea → localSeo → a JSON file), so anything
 * here that needs coverage data takes a lookup function instead. The page
 * passes the real `lookupServiceZip`; the tests pass the real ZIP list read
 * straight from localSeoData.json.
 */

/** What the hero's coverage check can say. */
export type HeroCoverage =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'covered'; zip: string; city: string; distanceMiles: number }
  | { kind: 'outside'; zip: string };

/** A covered ZIP's details, or null when we do not dispatch there. */
export type CoverageLookup = (zip: string) => { city: string; distanceMiles: number } | null;

/**
 * Read a ZIP out of whatever was typed and say whether we cover it.
 *
 * Accepts `76247`, ` 76247 `, `76247-1234` and `762471234`. Anything else is
 * `invalid` rather than a guess: a four-digit or six-digit entry is a typo, and
 * telling someone "we don't reach you" because of a typo loses the booking.
 */
export function checkHeroCoverage(input: string, lookup: CoverageLookup): HeroCoverage {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'empty' };

  const match = trimmed.match(/^(\d{5})(?:-?\d{4})?$/);
  if (!match) return { kind: 'invalid' };

  const zip = match[1];
  const hit = lookup(zip);
  if (!hit) return { kind: 'outside', zip };
  return { kind: 'covered', zip, city: hit.city, distanceMiles: hit.distanceMiles };
}

/** What the booking form accepts from the hero. Empty fields are left out so
 *  they never overwrite something the customer already typed in the form. */
export type HeroPrefill = {
  zipCode?: string;
  vehicle?: string;
  issueDescription?: string;
};

/** Everything the homepage can hand the booking form: the hero's fields, or a
 *  service picked from the grid. */
export type BookingPrefill = HeroPrefill & { services?: string[] };

export function heroPrefill(fields: { zip: string; vehicle: string; issue: string }): HeroPrefill {
  const prefill: HeroPrefill = {};
  const vehicle = fields.vehicle.trim();
  const issue = fields.issue.trim();
  if (fields.zip) prefill.zipCode = fields.zip;
  if (vehicle) prefill.vehicle = vehicle;
  if (issue) prefill.issueDescription = issue;
  return prefill;
}

export type TownForDisplay = { city: string; distanceMiles: number };

/**
 * The towns the coverage section names, nearest first, and how many it leaves
 * out. Nearest first because that is who is most likely reading: the page
 * ranks for Justin and the towns around it before the edge of the radius.
 */
export function townsForDisplay<T extends TownForDisplay>(
  cities: T[],
  shown: number
): { towns: T[]; remaining: number; total: number } {
  const sorted = cities
    .slice()
    .sort((a, b) => a.distanceMiles - b.distanceMiles || a.city.localeCompare(b.city));
  const towns = sorted.slice(0, Math.max(0, shown));
  return { towns, remaining: sorted.length - towns.length, total: sorted.length };
}

/** "$100" for the diagnostic itself; "From $100" for anything priced on site. */
export function servicePriceLabel(service: { kind: string; price: number }): string {
  const amount = `$${service.price}`;
  return service.kind === 'diagnostic' ? amount : `From ${amount}`;
}

/**
 * The services the homepage features, in the order given. An id that is not
 * in the bookable catalog — retired, or switched off — is skipped rather than
 * shown as a card that books something we no longer offer.
 */
export function featuredServices<T extends { id: string }>(bookable: T[], ids: string[]): T[] {
  const byId = new Map(bookable.map((s) => [s.id, s]));
  return ids.flatMap((id) => {
    const hit = byId.get(id);
    return hit ? [hit] : [];
  });
}
