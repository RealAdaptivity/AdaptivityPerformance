import { supabase } from './supabaseClient';

/**
 * Shop labor rate.
 *
 * SEOContentBlock told customers "we charge a flat $125/hr labor rate" while
 * every internal tool asked for a flat dollar figure and left hours x rate to
 * whoever was typing. Same shape as the service radius, the business name, the
 * opening hours and the tax rate: a number published in one place and used
 * nowhere else. Declared once here, so the page and the quote agree.
 */

export const LABOR_RATE_CENTS = 15_000;
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

/**
 * The shop's working default, set by the owner in the admin portal and stored in
 * app_config. LABOR_RATE_CENTS above is what the marketing page advertises and
 * is baked in at build time; this is what new quotes start from. They should
 * match — the Quotes tab says so out loud when they do not, because a site
 * advertising one rate while quotes go out at another is how a customer ends up
 * arguing about a number.
 */
export const DEFAULT_LABOR_RATE_KEY = 'default_labor_rate_cents';

export async function fetchDefaultLaborRateCents(): Promise<number> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', DEFAULT_LABOR_RATE_KEY)
    .maybeSingle();
  if (error) return LABOR_RATE_CENTS;
  const parsed = Number(data?.value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : LABOR_RATE_CENTS;
}

/** Admin-only; the RLS policy refuses anyone else. */
export async function setDefaultLaborRateCents(cents: number): Promise<void> {
  const value = Math.round(cents);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a labor rate above zero');
  const { error } = await supabase
    .from('app_config')
    .upsert({ key: DEFAULT_LABOR_RATE_KEY, value: String(value) }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}
