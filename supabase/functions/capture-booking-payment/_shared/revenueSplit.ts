/**
 * Platform marketplace split:
 * - Labor / Diag / Mileage: Tech receives 70%, Platform receives 30%.
 * - Parts:
 *     - If bought by Tech (partsPurchasedBy === 'tech', default): Tech receives 100% of parts cost (platform takes 0%).
 *     - If bought by Company (partsPurchasedBy === 'company'): Company keeps 100% of parts cost (tech receives 0%).
 * - Sales Tax (e.g. 8.25% in Texas): 100% platform remittance revenue (0% to tech).
 */
export const TECH_LABOR_SHARE = 0.7;
export const PLATFORM_LABOR_SHARE = 0.3;
export const TECH_REVENUE_SHARE = 0.7;
export const PLATFORM_REVENUE_SHARE = 0.3;

export function splitJobTotalCents(
  totalCents: number,
  salesTaxCents: number = 0,
  partsCents: number = 0,
  partsPurchasedBy: 'tech' | 'company' = 'tech'
) {
  const safeTaxCents = Math.max(0, Math.min(salesTaxCents, totalCents));
  const safePartsCents = Math.max(0, Math.min(partsCents, totalCents - safeTaxCents));
  const laborAndDiagCents = Math.max(0, totalCents - safeTaxCents - safePartsCents);

  const techLaborCents = Math.round(laborAndDiagCents * TECH_LABOR_SHARE);
  const platformLaborCents = laborAndDiagCents - techLaborCents;

  const techPartsCents = partsPurchasedBy === 'tech' ? safePartsCents : 0;
  const platformPartsCents = safePartsCents - techPartsCents;

  const techTransferCents = techLaborCents + techPartsCents;
  const platformFeeCents = platformLaborCents + platformPartsCents + safeTaxCents;

  return {
    platformFeeCents,
    techTransferCents,
    techLaborCents,
    techPartsCents,
    laborAndDiagCents,
    partsCents: safePartsCents,
    salesTaxCents: safeTaxCents,
    partsPurchasedBy,
  };
}
