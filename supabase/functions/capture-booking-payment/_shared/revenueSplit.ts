/**
 * Platform marketplace split:
 * Tech receives 70% of the pre-tax labor/parts/mileage subtotal.
 * Sales Tax (e.g. 8.25% in Texas) is 100% platform remittance revenue (0% to tech).
 */
export const TECH_REVENUE_SHARE = 0.7;
export const PLATFORM_REVENUE_SHARE = 0.3;

export function splitJobTotalCents(totalCents: number, salesTaxCents: number = 0) {
  const safeTaxCents = Math.max(0, Math.min(salesTaxCents, totalCents));
  const preTaxSubtotalCents = Math.max(0, totalCents - safeTaxCents);
  const techTransferCents = Math.round(preTaxSubtotalCents * TECH_REVENUE_SHARE);
  const platformFeeCents = totalCents - techTransferCents;
  return { platformFeeCents, techTransferCents, preTaxSubtotalCents, salesTaxCents: safeTaxCents };
}
