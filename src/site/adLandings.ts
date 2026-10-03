/**
 * Paid-traffic landing pages (`/lp/{slug}`).
 *
 * These are deliberately kept out of sitemap.xml and marked noindex: they exist
 * to convert a click we already paid for, and letting them compete with the
 * organic service pages for the same query wastes both.
 */
import { LOCAL_HUB } from './localSeo';

export type AdLanding = {
  slug: string;
  /** Ad-matched headline — should echo the keyword the click came from. */
  headline: string;
  subhead: string;
  offer: string;
  bullets: string[];
  proof: string[];
  ctaLabel: string;
};

export const AD_LANDINGS: AdLanding[] = [
  {
    slug: 'same-day',
    headline: 'Mobile mechanic today, at your driveway',
    subhead: `We dispatch from Justin and stay inside ${LOCAL_HUB.radiusMiles} miles, so a same-day slot is a real promise and not a callback tomorrow.`,
    offer: '$100 diagnostic — credited in full toward the repair',
    bullets: [
      'Same-day and next-day slots most weekdays',
      'We come to your house or your workplace parking lot',
      'Labor and parts priced on site, before anything comes apart',
      '12-month / 12,000-mile warranty on parts and labor',
    ],
    proof: ['ASE-level techs', 'Fully equipped vans', 'No tow, no drop-off'],
    ctaLabel: 'Get a tech out today',
  },
  {
    slug: 'brakes',
    headline: 'Brake repair in your driveway',
    subhead:
      'Pads, rotors, calipers and hardware replaced where the car sits. We measure first and show you the numbers, so you are not paying for rotors that were fine.',
    offer: 'Most brake jobs $180 - $420 per axle, parts and labor',
    bullets: [
      'Pad thickness and rotor runout measured before we quote',
      'Most brake jobs finish in a single visit',
      'Torque-to-spec reinstall and a road test before we leave',
      '12-month / 12,000-mile warranty on parts and labor',
    ],
    proof: ['Measured, not guessed', 'One visit', 'Warrantied'],
    ctaLabel: 'Book my brake job',
  },
  {
    slug: 'check-engine',
    headline: 'Check engine light, actually diagnosed',
    subhead:
      'Not a free parts-store code read. We pull live data and run the manufacturer test procedure for the stored code, so you replace the part that failed instead of guessing.',
    offer: '$100 diagnostic — applied in full to the repair',
    bullets: [
      'Full OBD-II scan with freeze-frame and live sensor data',
      'Manufacturer test procedure for your specific code',
      'Written findings and a priced repair plan, same visit',
      'We come to you — the car never leaves your driveway',
    ],
    proof: ['Live data, not a code read', 'Written findings', 'Diagnostic credited'],
    ctaLabel: 'Diagnose my check engine light',
  },
  {
    slug: 'dallas',
    headline: 'A mobile mechanic who comes to you in Dallas',
    subhead:
      'We run out of a shop in Justin and dispatch across the metroplex. Brakes, diagnostics, batteries, starters and A/C done in your driveway or your office parking lot — no tow, no drop-off, no waiting room.',
    offer: '$100 diagnostic — credited in full toward the repair',
    bullets: [
      'We come to your home or your workplace anywhere in Dallas',
      'Labor and parts priced on site, before anything comes apart',
      'Travel is quoted up front — you see the number before you approve anything',
      '12-month / 12,000-mile warranty on parts and labor',
    ],
    proof: ['ASE-level techs', 'Fully equipped vans', 'Priced before we start'],
    ctaLabel: 'Book a Dallas visit',
  },
  {
    slug: 'fort-worth',
    headline: 'A mobile mechanic who comes to you in Fort Worth',
    subhead:
      'We are already in north Fort Worth most days — Alliance, Presidio, Park Glen, Heritage — and we cover downtown, the Cultural District and the near west side from our Justin shop.',
    offer: '$100 diagnostic — credited in full toward the repair',
    bullets: [
      'Driveway and workplace visits across Fort Worth',
      'Same-day and next-day slots most weekdays',
      'Labor and parts priced on site, before anything comes apart',
      '12-month / 12,000-mile warranty on parts and labor',
    ],
    proof: ['Already north of the loop daily', 'No tow, no drop-off', 'Warrantied'],
    ctaLabel: 'Book a Fort Worth visit',
  },
  {
    slug: 'pre-purchase-inspection',
    headline: 'Do not buy that used car yet',
    subhead:
      'We meet you at the seller, put the car through a full inspection, and hand you a photo report inside the hour — while you are still standing there deciding.',
    offer: 'Flat $145 inspection, report included',
    bullets: [
      'Full scan including pending and history codes',
      'Undercarriage, frame rail and leak inspection',
      'Paint depth readings that expose hidden bodywork',
      'Photo report within the hour, ready to negotiate with',
    ],
    proof: ['Report in an hour', 'Private party or dealer', 'Flat price'],
    ctaLabel: 'Book an inspection',
  },
];

export function adLandingFromPath(pathname: string): AdLanding | null {
  const m = pathname.replace(/\/$/, '').match(/^\/lp\/([a-z0-9-]+)$/i);
  if (!m) return null;
  return AD_LANDINGS.find((l) => l.slug === m[1].toLowerCase()) ?? null;
}

export function adLandingPath(slug: string): string {
  return `/lp/${slug}`;
}

export function adLandingMeta(landing: AdLanding) {
  return {
    title: `${landing.headline} | Adaptivity Performance`,
    description: `${landing.subhead} ${landing.offer}.`,
    path: adLandingPath(landing.slug),
  };
}

/** utm_* values from the current URL, for attributing the conversion to a campaign. */
export function campaignParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 80);
  }
  return out;
}
