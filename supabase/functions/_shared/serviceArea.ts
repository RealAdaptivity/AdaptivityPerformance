/** Mobile dispatch: DFW / Fort Worth area (keep in sync with src/services/serviceArea.ts). */

export const COVERED_ZIP_PREFIXES = ['750', '751', '752', '760', '761', '762'] as const;

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

export function assertServiceArea(zipCode: string | null | undefined, locationType: string) {
  if (locationType === 'shop') return;
  const zip = normalizeZip(zipCode);
  if (!zip) {
    throw new Error('A valid 5-digit service zip code is required for mobile dispatch.');
  }
  if (!isCoveredZip(zip)) {
    throw new Error(
      `Mobile service is not available in zip ${zip}. We serve the DFW / Fort Worth metro (TX zips starting 750–752 and 760–762). Call (940) 304-0620 for extended-area quotes or book shop service in Justin.`
    );
  }
}

/** Prefer dedicated zip field; fall back to parsing address line. */
export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}
