/** The text a customer gets when a booking request goes through.
 *
 *  Until now a customer who booked on the website received nothing at all —
 *  no email, no text, just a reference code on the screen they were free to
 *  navigate away from. This builds the one message that fixes that.
 *
 *  Kept separate from the edge function so it can be unit-tested without a
 *  Deno runtime, a database or a Twilio account.
 */

export type BookingConfirmationInput = {
  referenceCode: string;
  services: string[];
  quotedDollars: number;
  quoteMode: 'diagnostic' | 'direct';
  vehicleDescription?: string | null;
  /** 'YYYY-MM-DD', as stored in bookings.preferred_date. */
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  siteUrl?: string | null;
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** '2026-10-02' -> 'Fri Oct 2'.
 *
 *  Built from the parts rather than `new Date('2026-10-02')`, which parses as
 *  UTC midnight and renders as the previous day everywhere in the US. Texas is
 *  the only timezone this business operates in, so that would have been wrong
 *  on every single message.
 */
export function formatPreferredDate(iso?: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  // Rejects the likes of 2026-02-31, which Date silently rolls into March.
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${DAYS[dt.getDay()]} ${MONTHS[m - 1]} ${d}`;
}

/** Each SMS segment is billed separately, so this stays deliberately terse:
 *  what was booked, when, what it costs, and that no card is taken online. */
export function buildBookingConfirmationSms(input: BookingConfirmationInput): string {
  const parts: string[] = [];

  const what = input.vehicleDescription?.trim() || input.services[0]?.trim();
  parts.push(
    what
      ? `Adaptivity Performance: request ${input.referenceCode} received for ${what}.`
      : `Adaptivity Performance: request ${input.referenceCode} received.`
  );

  const when = [formatPreferredDate(input.preferredDate), input.preferredTimeWindow?.trim()]
    .filter(Boolean)
    .join(', ');
  if (when) parts.push(`${when}.`);

  parts.push(
    input.quoteMode === 'diagnostic'
      ? `$${input.quotedDollars} diagnostic; your tech quotes any repair on site before starting.`
      : `Estimate $${input.quotedDollars}.`
  );

  parts.push('Pay your tech in person when the work is done — nothing is charged online.');

  const site = input.siteUrl?.trim().replace(/\/$/, '');
  if (site) parts.push(`Track it at ${site}`);

  return parts.join(' ');
}
