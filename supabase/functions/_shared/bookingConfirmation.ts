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
  /** Flat travel fee on a mobile visit; 0 or absent for a shop drop-off. */
  travelDollars?: number;
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

  const travel = input.travelDollars && input.travelDollars > 0 ? ` + $${input.travelDollars} travel` : '';
  parts.push(
    input.quoteMode === 'diagnostic'
      ? `$${input.quotedDollars} diagnostic${travel}; your tech quotes any repair on site before starting.`
      : `Estimate $${input.quotedDollars}${travel}.`
  );

  parts.push('Pay your tech in person when the work is done — nothing is charged online.');

  const site = input.siteUrl?.trim().replace(/\/$/, '');
  if (site) parts.push(`Track it at ${site}`);

  return parts.join(' ');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type BookingConfirmationEmailInput = BookingConfirmationInput & {
  customerName: string;
  /** Shown as "Questions? Call …" and used for the call link. */
  businessPhone: string;
  /** Legal name and address for the footer, as on the receipt. */
  businessFooter: string;
};

/** The email a customer gets when a booking request goes through: the same
 *  facts as the text, plus what happens next. Sent only when they gave an
 *  email address. */
export function buildBookingConfirmationEmail(input: BookingConfirmationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const first = input.customerName.trim().split(/\s+/)[0] || 'there';
  const site = (input.siteUrl?.trim() || 'https://adaptivityperformance.com').replace(/\/$/, '');
  const siteLabel = site.replace(/^https?:\/\//, '');
  const vehicle = input.vehicleDescription?.trim() || '';
  const services = input.services.map((s) => s.trim()).filter(Boolean).join(', ');
  const when =
    [formatPreferredDate(input.preferredDate), input.preferredTimeWindow?.trim()].filter(Boolean).join(', ') ||
    'We’ll call or text you to set a time';
  const travel = input.travelDollars && input.travelDollars > 0 ? ` + $${input.travelDollars} travel` : '';
  const cost =
    input.quoteMode === 'diagnostic'
      ? `$${input.quotedDollars} diagnostic${travel}. Your tech prices any repair on site before starting.`
      : `Estimate $${input.quotedDollars}${travel}.`;
  const steps = [
    'We call or text to confirm your arrival time.',
    'Your technician texts when they’re on the way.',
    'You pay the technician in person when the work is done. Nothing is charged online.',
  ];
  const rows: [string, string][] = [
    ['Confirmation', input.referenceCode],
    ...(vehicle ? ([['Vehicle', vehicle]] as [string, string][]) : []),
    ...(services ? ([['Service', services]] as [string, string][]) : []),
    ['When', when],
    ['Cost', cost],
  ];

  const subject = `Booking received — ${input.referenceCode}`;

  const text = [
    `Hi ${first},`,
    '',
    'We got your request for a mobile visit from Adaptivity Performance.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'What happens next',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Need to change something? Call ${input.businessPhone} or reply to this email.`,
    `Check on your booking any time at ${siteLabel} (menu → Track Dispatch, then enter ${input.referenceCode}).`,
    '',
    input.businessFooter,
  ].join('\n');

  const tel = input.businessPhone.replace(/[^\d+]/g, '');
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;vertical-align:top;width:110px">${esc(k)}</td><td style="padding:8px 0;font-size:14px;font-weight:600">${esc(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:16px;padding:24px">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr>
<td style="vertical-align:middle;width:44px"><img src="${esc(site)}/logo-128.png" width="44" height="44" alt="" style="display:block;border-radius:10px"></td>
<td style="vertical-align:middle;padding-left:12px"><div style="font-size:17px;font-weight:700">Adaptivity Performance</div>
<div style="font-size:12px;color:#71717a">Mobile auto repair · Justin, TX</div></td>
</tr></table>
<h1 style="font-size:22px;margin:20px 0 4px">You’re on the board, ${esc(first)}.</h1>
<p style="font-size:14px;color:#52525b;margin:0">We got your request for a mobile visit.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e4e4e7">${rows.map(row).join('')}</table>
<h2 style="font-size:15px;margin:20px 0 8px">What happens next</h2>
<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.6">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<p style="margin:20px 0 0"><a href="tel:${esc(tel)}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 16px;border-radius:10px">Call ${esc(input.businessPhone)}</a></p>
<p style="font-size:13px;color:#52525b;margin:16px 0 0">Need to change something? Call us or reply to this email. To check on your booking, open <a href="${esc(site)}" style="color:#c2410c">${esc(siteLabel)}</a>, tap <strong>Track Dispatch</strong> in the menu and enter ${esc(input.referenceCode)}.</p>
</div>
<p style="font-size:12px;color:#71717a;text-align:center;margin-top:16px">${esc(input.businessFooter)}</p>
</div></body></html>`;

  return { subject, text, html };
}
