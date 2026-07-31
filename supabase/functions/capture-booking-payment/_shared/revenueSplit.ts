/** Platform marketplace split: tech receives 70% of captured job total. */
export const TECH_REVENUE_SHARE = 0.7;
export const PLATFORM_REVENUE_SHARE = 0.3;

export function splitJobTotalCents(totalCents: number) {
  const platformFeeCents = Math.round(totalCents * PLATFORM_REVENUE_SHARE);
  const techTransferCents = totalCents - platformFeeCents;
  return { platformFeeCents, techTransferCents };
}
