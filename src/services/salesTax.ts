/**
 * Texas sales tax for mobile repair work.
 *
 * The 8.25% DFW rate was hardcoded separately in DispatchConsole, TechJobsTab
 * and the Connect service. Three copies of a number that changes by
 * jurisdiction is the same drift that put two different service radii on the
 * site, so it is declared once here.
 *
 * Default mode is 'parts': in Texas, repair labour on a motor vehicle is not
 * taxable when it is separately stated on the invoice, while parts are. That is
 * what the charge receipts already say ("Sales tax (parts)"), so quotes must
 * agree or a customer gets quoted one number and charged another.
 *
 * Not tax advice — confirm the rate and treatment for your jurisdiction.
 */

export const SALES_TAX_BASIS_POINTS = 825;
export const SALES_TAX_RATE = SALES_TAX_BASIS_POINTS / 10_000;
export const SALES_TAX_LABEL = `${(SALES_TAX_RATE * 100).toFixed(2).replace(/\.?0+$/, '')}%`;

export type TaxMode = 'parts' | 'total' | 'none';

export const TAX_MODE_LABELS: Record<TaxMode, string> = {
  parts: `Parts only (${SALES_TAX_LABEL})`,
  total: `Full invoice (${SALES_TAX_LABEL})`,
  none: 'No sales tax',
};

/** Round half-up to whole cents — never trust float drift on money. */
function roundCents(n: number): number {
  return Math.round(n);
}

export function taxableCents(opts: {
  laborCents: number;
  partsCents: number;
  mode: TaxMode;
}): number {
  if (opts.mode === 'parts') return Math.max(0, opts.partsCents);
  if (opts.mode === 'total') return Math.max(0, opts.laborCents + opts.partsCents);
  return 0;
}

export function salesTaxCents(opts: {
  laborCents: number;
  partsCents: number;
  mode: TaxMode;
  basisPoints?: number;
}): number {
  const bp = opts.basisPoints ?? SALES_TAX_BASIS_POINTS;
  return roundCents((taxableCents(opts) * bp) / 10_000);
}
