/** BNPL lenders: Affirm, Afterpay, Zip, Sunbit, Klarna (via Stripe dynamic payment methods). */

export const BNPL_LENDERS = ['Affirm', 'Afterpay', 'Zip', 'Sunbit', 'Klarna'] as const;

export const BNPL_PAY_IN_4_MIN_DOLLARS = 50;
export const BNPL_PAY_IN_4_MAX_DOLLARS = 700;
export const BNPL_LONGER_MIN_DOLLARS = 100;
export const BNPL_LONGER_MAX_DOLLARS = 30000;

/** Stripe API types excluded from card holds (BNPL is final-checkout only). */
export const BNPL_EXCLUDED_FROM_HOLDS = [
  'affirm',
  'klarna',
  'afterpay_clearpay',
  'zip',
  'sunbit',
] as const;

export type BnplPlanHint = 'pay_in_4' | 'longer' | 'none';

/** Map cart total to the financing story we advertise (lenders decide the exact plan). */
export function bnplPlanHintForAmount(dollars: number): BnplPlanHint {
  if (!Number.isFinite(dollars) || dollars < BNPL_PAY_IN_4_MIN_DOLLARS) return 'none';
  if (dollars <= BNPL_PAY_IN_4_MAX_DOLLARS) return 'pay_in_4';
  if (dollars >= BNPL_LONGER_MIN_DOLLARS && dollars <= BNPL_LONGER_MAX_DOLLARS) return 'longer';
  return 'none';
}

export function bnplLenderList(): string {
  return BNPL_LENDERS.join(' · ');
}

export function bnplHeadline(dollars: number): string | null {
  const hint = bnplPlanHintForAmount(dollars);
  if (hint === 'pay_in_4') {
    return `Eligible total — Pay in 4 may be available (Affirm, Afterpay, Zip, Klarna)`;
  }
  if (hint === 'longer') {
    return `Eligible total — longer plans available (Sunbit 3–18 mo · Affirm/Klarna monthly · Pay in 8–style)`;
  }
  return null;
}

export function bnplShortBlurb(dollars: number): string {
  const hint = bnplPlanHintForAmount(dollars);
  if (hint === 'pay_in_4') {
    return 'Split into 4 payments when Affirm, Afterpay, Zip, or Klarna approves you at checkout.';
  }
  if (hint === 'longer') {
    return 'Choose longer installments via Sunbit (3, 6, 12, 18+ months) or Affirm/Klarna monthly — lender shows exact terms at checkout.';
  }
  return `Card now, or financing at final checkout via ${bnplLenderList()} when your total qualifies.`;
}
