/** Site SEO helpers — document title, meta, city landings. */
import { LOCAL_CITIES, LOCAL_HUB, cityPathOf, type LocalCity } from './localSeo';

export const SITE_ORIGIN = 'https://adaptivityperformance.com';
/** Grasshopper business line — single source of truth for public contact. */
export const SITE_PHONE_DISPLAY = '(940) 304-0620';
/** E.164 for schema / SMS / `tel:` construction */
export const SITE_PHONE_E164 = '+19403040620';
export const SITE_PHONE_DIGITS = '9403040620';
/** Ready for href={SITE_PHONE_TEL} */
export const SITE_PHONE_TEL = `tel:${SITE_PHONE_E164}`;

/**
 * Live Google Business “Write a review” deep link. The env var is an override
 * for previews and staging; the default below is the real production link, so a
 * missing env var degrades to the correct behaviour rather than a dead CTA.
 */
export const GOOGLE_REVIEW_URL =
  (import.meta.env.VITE_GOOGLE_REVIEW_URL as string | undefined)?.trim() ||
  'https://g.page/r/CaIynDu9Qo0SEBM/review';

/**
 * Profiles that belong to this business, for schema.org `sameAs`.
 *
 * This is how a search engine ties the website to the map listing and the
 * social profiles as one entity rather than several look-alike businesses, so
 * only add a URL that is confirmed to be ours. Query strings are stripped —
 * `?hl=en` and the like are viewer state, not part of the profile's identity.
 */
/**
 * The business name exactly as the Google Business Profile carries it.
 *
 * schema.org `name` must match the listing character for character — that match
 * is part of how a search engine decides the website and the map listing are
 * one business. This constant is the single place the site declares it, so the
 * two cannot drift the way index.html and structuredData.ts did.
 *
 * If the listing is ever renamed — including by Google, which does edit names
 * that carry service keywords — change this line to match and the schema, the
 * build check and anything else reading it follow.
 */
export const GOOGLE_BUSINESS_PROFILE_NAME = 'Adaptivity Performance - Mobile Auto Repair';

/**
 * Dispatch hours, declared once.
 *
 * The site told customers "8AM–10PM" in six hand-written places while the
 * schema told Google 00:00–23:59 — open around the clock. That mismatch puts
 * the business in "open now" results at 3am, so the call lands on nobody and
 * the customer writes the review that follows from that. These values feed both
 * the copy and the schema, and must also match the Google listing's hours.
 */
export const BUSINESS_HOURS = {
  opens: '08:00',
  closes: '22:00',
  /** For display; derived so the label cannot drift from the times above. */
  get label(): string {
    const fmt = (t: string) => {
      const [h] = t.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}${suffix}`;
    };
    return `${fmt(this.opens)}\u2013${fmt(this.closes)}`;
  },
} as const;

export type SocialProfile = { label: string; url: string };

export const SOCIAL_PROFILES: readonly SocialProfile[] = [
  {
    label: 'Google',
    // From Google's own Share dialog. share.google is a redirector rather than
    // a canonical maps URL — if it is replaced with the expanded
    // https://www.google.com/maps/place/... form, swap it here and both the
    // footer link and sameAs follow.
    url: 'https://share.google/OttBrvyUOiI6R6svU',
  },
  { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61593460179618' },
  { label: 'Instagram', url: 'https://www.instagram.com/adaptivityperformance/' },
];

export const SOCIAL_PROFILE_URLS: readonly string[] = SOCIAL_PROFILES.map((p) => p.url);

export type SeoMeta = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_SEO: Record<string, SeoMeta> = {
  home: {
    title: 'Mobile Mechanic Justin TX | Driveway Auto Repair — Adaptivity Performance',
    description:
      `Mobile mechanic serving Justin, TX and every driveway within ${LOCAL_HUB.radiusMiles} miles — Northlake, Argyle, Roanoke, Denton, Keller, Haslet and north Fort Worth. On-site brakes, diagnostics, starters, batteries and oil changes. Call ${SITE_PHONE_DISPLAY}.`,
    path: '/',
  },
  about: {
    title: 'About Us | Premier Mechanic Shop & Mobile Auto Repair — Adaptivity',
    description:
      `Adaptivity Performance runs one shop hub in Justin, TX and a mobile fleet that stays inside a ${LOCAL_HUB.radiusMiles}-mile radius — so the van that quotes you is the van that shows up.`,
    path: '/about',
  },
  services: {
    title: 'Auto Repair Services | Mechanic Shop & Mobile Van Dispatch — Adaptivity',
    description:
      'Brake replacement, check engine diagnostics, battery and starter swaps, A/C repair, pre-purchase inspections and full synthetic oil changes — done in your driveway.',
    path: '/services',
  },
  contact: {
    title: 'Contact Us | Mobile Mechanic Dispatch — Justin, TX',
    description:
      `Same-day mobile dispatch, phone quotes, and 8AM–10PM support for Justin and the surrounding ${LOCAL_HUB.radiusMiles} miles. Call ${SITE_PHONE_DISPLAY}.`,
    path: '/contact',
  },
  coverage: {
    title: `Service Area | ${LOCAL_HUB.radiusMiles} Miles From Justin, TX`,
    description: `Check your zip against our ${LOCAL_HUB.radiusMiles}-mile mobile radius — Justin, Northlake, Argyle, Roanoke, Denton, Keller, Haslet, Southlake, Grapevine and north Fort Worth.`,
    path: '/coverage',
  },
  faq: {
    title: 'FAQ | Mobile Mechanic Justin & Northlake TX — Adaptivity',
    description:
      'Travel fees, labor rates, warranty, and mobile vs shop — answers for Justin, Northlake, Argyle and Denton customers.',
    path: '/faq',
  },
  partners: {
    title: 'Partner Shops & Garages | Adaptivity Performance',
    description: 'Host Adaptivity jobs at your shop or garage inside our Justin radius. We book, schedule, and dispatch.',
    path: '/partners',
  },
  join: {
    title: 'Join as a Tech | 1099 Mobile Mechanic Jobs — Adaptivity',
    description: 'Keep 70% of labor. Apply for mobile dispatch out of our Justin hub.',
    path: '/join',
  },
  careers: {
    title: 'Careers | Adaptivity Performance',
    description: 'Technician and partner opportunities with Adaptivity Performance in North Texas.',
    path: '/careers',
  },
  membership: {
    title: 'Membership Plans | Adaptivity Performance',
    description: 'Priority dispatch and member perks for drivers inside our Justin service radius.',
    path: '/membership',
  },
  diagnostics: {
    title: 'Diagnostic Assistant | Adaptivity Performance',
    description: 'Describe symptoms and get recommended services before you book.',
    path: '/diagnostics',
  },
  performance: {
    title: 'Performance Upgrades | Adaptivity Performance Justin TX',
    description: 'Lifts, exhaust, tuning, and shop builds at the Justin hub.',
    path: '/performance',
  },
  wantToTeach: {
    title: 'Teach With Adaptivity | Mentorship',
    description: 'Share your trade skills with the next generation of DFW techs.',
    path: '/want-to-teach',
  },
  learn: {
    title: 'Learn Auto Repair | Adaptivity Training',
    description: 'Hands-on learning paths for aspiring mobile and shop technicians.',
    path: '/learn',
  },
  terms: {
    title: 'Terms of Service | Adaptivity Performance',
    description: 'Master service agreement and legal disclosures for Adaptivity Performance LLC.',
    path: '/terms',
  },
  privacy: {
    title: 'Privacy Policy | Adaptivity Performance',
    description: 'Privacy policy and data protection disclosures for Adaptivity Performance LLC.',
    path: '/privacy',
  },
  refunds: {
    title: 'Refund & Cancellation Policy | Adaptivity Performance',
    description: 'Clear refund terms for the $100 diagnostic, 12-month warranties, and customer cancellations.',
    path: '/refund-policy',
  },
};

export type CityLanding = LocalCity;

/** Every city inside the Justin 20-mile radius. Source of truth: localSeoData.json. */
export const CITY_LANDINGS: CityLanding[] = LOCAL_CITIES;

export function cityPath(slug: string): string {
  return cityPathOf(slug);
}

export function cityFromPath(pathname: string): CityLanding | null {
  const m = pathname.match(/\/mobile-mechanic-([a-z0-9-]+)-tx\/?$/i);
  if (!m) return null;
  return CITY_LANDINGS.find((c) => c.slug === m[1].toLowerCase()) ?? null;
}

export function citySeo(city: CityLanding): SeoMeta {
  return {
    title: `Mobile Mechanic ${city.city}, TX | Same-Day Driveway Repair — Adaptivity`,
    description: `Mobile mechanic in ${city.city}, TX (${city.zips.join(', ')}) — ${city.distanceMiles} miles from our Justin hub, about ${city.driveMinutes} minutes out. Brakes, diagnostics, batteries, A/C and oil service at your driveway. Call ${SITE_PHONE_DISPLAY}.`,
    path: cityPath(city.slug),
  };
}

export const SITE_FAQS = [

  // PRICING & PAYMENT
  {
    q: 'How does mobile mechanic service work in Justin and Northlake, TX?',
    a: 'Our certified mobile technicians drive directly to your driveway, office parking lot, or roadside location in Justin (76247) and Northlake (76226 / 76262). We bring professional lift jacks, OEM parts, and diagnostic equipment to perform brakes, oil changes, batteries, starters, and diagnostics on-site.',
  },
  {
    q: 'Are there travel fees for mobile service in Justin or Northlake?',
    a: 'No! Mobile dispatch for any location within a 15-mile radius of our Justin hub (including Harvest, Canyon Falls, and Pecan Square) is 100% FREE ($0 travel fee). For locations past 15 miles (Argyle, Haslet, Denton, Keller), travel is billed at a transparent $2.00 per extra mile.',
  },
  {
    q: 'What is your hourly labor rate for auto repairs?',
    a: 'Adaptivity Performance operates on a flat, transparent labor rate of $125 per hour for both mobile and in-shop repairs. Specialty German/European vehicles (BMW, Mercedes, Audi) carry a 1.35x specialty multiplier due to European fluid standards and diagnostic coding requirements. Heavy-duty diesel trucks and exotics also carry applicable multipliers disclosed up front before any work begins.',
  },
  {
    q: 'Do you charge a diagnostic fee?',
    a: 'Yes. A $100 diagnostic fee applies to all vehicle inspections and check engine light scans. This fee is fully credited toward any repair we perform on the same visit — so if you approve the repair, the diagnostic effectively costs you nothing. If you decline the repair, the $100 covers the technician\'s time and equipment usage.',
  },
  {
    q: 'Do you offer financing or payment plans?',
    a: 'Yes! We partner with Affirm, Klarna, and Afterpay to offer 0% APR Pay-in-4 installment plans on qualifying repair totals. Select your financing option at checkout before confirming your booking. Subject to lender approval and credit terms.',
  },
  {
    q: 'Do you accept cash?',
    a: 'We take payment in person when the work is done. Your technician accepts all major credit and debit cards (Visa, Mastercard, Amex, Discover) by card, tap or chip on a Square reader, and we also accept Zelle for applicable balances. Nothing is charged online and no card is needed to book.',
  },
  {
    q: 'Do I need to pay anything to book an appointment?',
    a: 'No. Booking takes no card and charges nothing. You pay your technician in person when the work is done, by card, tap or chip on their reader. If you approve a repair, the $100 diagnostic is credited in full toward your final invoice.',
  },
  {
    q: 'What happens if I need to cancel or reschedule my appointment?',
    a: 'Cancellations made more than 2 hours before the scheduled appointment window are fully refunded with no penalty. Cancellations within 2 hours of the appointment are billed the $100 diagnostic as a late cancellation fee. Same-day no-shows without notice are billed the same. Rescheduling more than 2 hours in advance is always free.',
  },

  // SERVICES
  {
    q: 'What services can be performed mobile vs. requiring the shop?',
    a: 'Our mobile units handle: oil changes, brake pad/rotor replacements, battery swaps, starter/alternator replacements, serpentine belts, spark plugs, diagnostic scans, tire rotations, fluid flushes, and most bolt-on repairs. Services requiring the shop include: engine overhauls, transmission rebuilds, full wheel alignments, frame/body work, and truck suspension lifts with alignment.',
  },
  {
    q: 'Do you work on diesel trucks?',
    a: 'Absolutely. We service diesel-powered trucks including Ford Power Stroke, GM Duramax, and RAM Cummins platforms. Our technicians are experienced with DPF systems, EGR components, DEF systems, and high-pressure fuel systems. A heavy-duty labor multiplier applies for diesel-specific work — your tech will quote this before beginning any work.',
  },
  {
    q: 'Do you service European and luxury vehicles (BMW, Mercedes, Audi, Porsche, Land Rover)?',
    a: 'Yes. We specialize in European and luxury vehicles with factory-spec OEM parts and coding tools. BMW, Mercedes-Benz, Audi, Volkswagen, Porsche, Jaguar, and Land Rover are all within our scope. A 1.35x European specialty multiplier applies to account for manufacturer-specific fluid standards, coding procedures, and parts procurement. All service is reported to CARFAX.',
  },
  {
    q: 'Do you perform Texas state vehicle inspections?',
    a: 'We specialize in mobile on-site mechanical repairs, diagnostics, brakes, batteries, and maintenance services. State vehicle inspections require fixed lane equipment and will be offered once our physical garage hub location completes buildout.',
  },
  {
    q: 'Can you service my vehicle at my workplace or apartment complex?',
    a: 'Yes! Any accessible paved parking lot with reasonable overhead clearance works for mobile service. We have served vehicles at office campuses, HOA communities, apartment complexes, and retail parking lots across Justin, Northlake, Argyle, and Denton. We need the property owner or management permission for the location.',
  },
  {
    q: 'Do you offer fleet or HOA community service contracts?',
    a: 'Yes. We offer fleet maintenance contracts for businesses with multiple vehicles and HOA/community partnerships for residential neighborhoods. Fleet pricing includes priority scheduling, discounted labor rates, and monthly invoicing. Contact us directly to discuss a custom fleet or community contract.',
  },

  // BOOKING PROCESS
  {
    q: 'How do I book an appointment?',
    a: `Booking is 100% online — click Book Service on our website, select your service mode (mobile or shop), enter your vehicle details and service address, and choose an appointment window. No card is needed and nothing is charged online; you pay in person when the job is done. For same-day emergency dispatch, call or text us directly at ${SITE_PHONE_DISPLAY}.`,
  },
  {
    q: 'How long does a typical mobile repair take?',
    a: 'Most common services take between 30 minutes and 2.5 hours on-site: oil changes run 30–45 min, brake pad and rotor replacements take 1.5–2 hrs, battery swaps take 30–45 min, and full diagnostics take 45–90 min. Complex repairs or multi-system jobs may require same-day or next-day shop follow-up. Your tech will give you a time estimate before starting.',
  },
  {
    q: 'What if my vehicle is not driveable — do you offer towing?',
    a: 'Yes. We coordinate certified flatbed towing to our Justin shop for non-driveable vehicles. Towing is arranged through our licensed transport partners and billed separately at market rate. You will authorize towing in writing before dispatch. We manage the full coordination so you do not have to make multiple calls.',
  },
  {
    q: 'Will I receive a digital inspection report after my service?',
    a: 'Yes. Every completed service includes a digital multi-point inspection report with technician notes, photos of key findings, parts used with part numbers, labor time, and the final invoice. Reports are sent via email and SMS and are also accessible through your Customer Portal at adaptivityperformance.com/portal.',
  },

  // WARRANTY & LEGAL
  {
    q: 'What does the 12-Month / 12,000-Mile Warranty cover?',
    a: 'Our warranty covers all parts supplied and labor performed by Adaptivity Performance for 12 months or 12,000 miles from the date of service, whichever comes first. If the repaired system fails due to the same issue within the warranty period, we return and repair it at no charge. The warranty does not cover pre-existing unrelated damage, misuse, overheating from unrelated causes, or parts supplied by the customer.',
  },
  {
    q: 'What happens if a part fails after my repair?',
    a: 'Contact us immediately. If the failure is within the 12-month / 12,000-mile warranty window and related to our repair, we dispatch a technician or schedule shop time to fix it at no additional cost. For parts that carry manufacturer warranties beyond 12 months, we assist you in filing a claim with the parts distributor.',
  },
  {
    q: 'Will mobile repairs affect my factory warranty on a new vehicle?',
    a: 'Generally, no. Under the federal Magnuson-Moss Warranty Act, car manufacturers cannot void your factory warranty simply because you used an independent mechanic — they must prove the independent repair caused the issue. We always use OEM-quality or better parts and document everything. We recommend reviewing your specific manufacturer warranty terms for any special conditions.',
  },
  {
    q: 'Do you report completed service history to CARFAX?',
    a: 'Yes. Adaptivity Performance is a CARFAX and Experian AutoCheck certified reporting shop. Every completed repair order is reported using your vehicle VIN within 7–14 days, adding a verified service record to your vehicle history. This increases your vehicle resale value and provides buyer confidence.',
  },

  // SPECIALTY
  {
    q: 'Do you service electric or hybrid vehicles (EV/PHEV)?',
    a: 'Yes, for non-high-voltage systems. We service EV and hybrid vehicles for standard maintenance: 12V battery service, tire rotations, brake service including regenerative braking systems, cabin air filters, wiper blades, and software diagnostic reads. We do not perform high-voltage battery pack replacement, inverter repair, or high-voltage wiring work — those require manufacturer-certified EV facilities.',
  },
  {
    q: 'Do you do truck lifts, leveling kits, and performance upgrades?',
    a: 'Yes — that is a core specialty at our Justin garage hub. We install leveling kits, suspension lifts (2 to 8 inch), coilover upgrades, custom exhaust systems, cold air intakes, programmer tunes, upgraded brake packages, and other bolt-on performance modifications. All lift work requires a post-install alignment. We service trucks, SUVs, and off-road vehicles.',
  },
  {
    q: 'What services do you provide on-site?',
    a: 'Our fully-equipped mobile service vans handle on-site diagnostics, brake pads & rotors, battery replacements, starter/alternator replacements, fluid flushes, oil services, and multi-point inspections directly in your driveway or workplace parking lot.',
  },
];

export function applyDocumentSeo(meta: SeoMeta) {
  if (typeof document === 'undefined') return;
  document.title = meta.title;
  const url = `${SITE_ORIGIN}${meta.path === '/' ? '' : meta.path}`;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  const ogImage = `${SITE_ORIGIN}/og-image.png`;
  setMeta('meta[name="title"]', 'content', meta.title);
  setMeta('meta[name="description"]', 'content', meta.description);
  setMeta('meta[property="og:title"]', 'content', meta.title);
  setMeta('meta[property="og:description"]', 'content', meta.description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:image"]', 'content', ogImage);
  setMeta('meta[property="twitter:title"]', 'content', meta.title);
  setMeta('meta[property="twitter:description"]', 'content', meta.description);
  setMeta('meta[property="twitter:url"]', 'content', url);
  setMeta('meta[property="twitter:image"]', 'content', ogImage);

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

/**
 * Control indexing per route. Paid landing pages must not compete with the
 * organic service pages for the same query.
 */
export function setRobots(directive: 'index,follow' | 'noindex,nofollow') {
  if (typeof document === 'undefined') return;
  let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'robots';
    document.head.appendChild(tag);
  }
  tag.content = directive;
}

export async function shareAdaptivity(opts?: { title?: string; text?: string; url?: string }) {
  const title = opts?.title || 'Adaptivity Performance';
  const text =
    opts?.text ||
    `Mobile mechanic for Justin, Northlake & ${LOCAL_HUB.radiusMiles} miles around — book a $100 diagnostic visit. ${SITE_PHONE_DISPLAY}`;
  const url = opts?.url || SITE_ORIGIN;
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch {
      /* fall through */
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
