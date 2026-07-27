/** Service zips aligned with website ServiceAreaChecker. Shop bookings skip zip gate. */
export const COVERED_ZIPS = new Set([
  '76247',
  '76226',
  '76262',
  '76227',
  '76052',
  '76259',
  '76248',
  '76201',
]);

export function normalizeZip(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const m = input.trim().match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

export function assertServiceArea(zipCode: string | null | undefined, locationType: string) {
  if (locationType === 'shop') return;
  const zip = normalizeZip(zipCode);
  if (!zip) {
    throw new Error('A valid 5-digit service zip code is required for mobile dispatch.');
  }
  if (!COVERED_ZIPS.has(zip)) {
    throw new Error(
      `Mobile service is not available in zip ${zip}. Call (214) 620-3244 for extended-area quotes or book shop service.`
    );
  }
}

/** Prefer dedicated zip field; fall back to parsing address line. */
export function resolveServiceZip(zipCode: string | null | undefined, address: string | null | undefined) {
  return normalizeZip(zipCode) || normalizeZip(address) || null;
}
