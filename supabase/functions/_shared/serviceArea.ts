/** Mobile dispatch coverage. Auto-synced from src/site/localSeoData.json by
 *  scripts/sync-service-catalog.mjs — do not edit by hand.
 *
 *  An explicit allow-list, not a 3-digit prefix match: prefixes 751/752 are
 *  Dallas, twice as far as this business dispatches, and a prefix match
 *  accepted every one of them.
 */

export const COVERED_ZIPS: readonly string[] = [
  "75022",
  "75028",
  "75056",
  "75057",
  "75067",
  "75068",
  "75077",
  "76006",
  "76011",
  "76020",
  "76023",
  "76034",
  "76039",
  "76040",
  "76051",
  "76052",
  "76071",
  "76078",
  "76092",
  "76102",
  "76104",
  "76107",
  "76108",
  "76114",
  "76131",
  "76137",
  "76148",
  "76164",
  "76177",
  "76179",
  "76180",
  "76182",
  "76201",
  "76205",
  "76207",
  "76208",
  "76209",
  "76210",
  "76226",
  "76227",
  "76234",
  "76244",
  "76247",
  "76248",
  "76249",
  "76259",
  "76262",
  "76266"
];

const COVERED = new Set<string>(COVERED_ZIPS);

export function normalizeZip(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = input.trim().match(/\b(\d{5})\b/);
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
      `Mobile service is not available in zip ${zip}. We serve the Justin / north Fort Worth area within 25 miles of our hub. Call (940) 304-0620 for extended-area quotes or book shop service in Justin.`
    );
  }
}

/** Prefer dedicated zip field; fall back to parsing address line. */
export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}
