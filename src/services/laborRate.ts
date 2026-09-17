/**
 * Shop labor rate.
 *
 * SEOContentBlock told customers "we charge a flat $125/hr labor rate" while
 * every internal tool asked for a flat dollar figure and left hours x rate to
 * whoever was typing. Same shape as the service radius, the business name, the
 * opening hours and the tax rate: a number published in one place and used
 * nowhere else. Declared once here, so the page and the quote agree.
 */

export const LABOR_RATE_CENTS = 12_500;
export const LABOR_RATE_DOLLARS = LABOR_RATE_CENTS / 100;

/** "$125/hr" — for copy, derived so the label cannot drift from the number. */
export const LABOR_RATE_LABEL = `$${
  LABOR_RATE_DOLLARS % 1 === 0 ? LABOR_RATE_DOLLARS.toFixed(0) : LABOR_RATE_DOLLARS.toFixed(2)
}/hr`;

/** Labor charge for a number of hours, rounded to whole cents. */
export function laborCentsForHours(hours: number, rateCents = LABOR_RATE_CENTS): number {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return 0;
  return Math.round(h * rateCents);
}
