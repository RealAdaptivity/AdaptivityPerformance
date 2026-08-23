/** Site SEO helpers — document title, meta, city landings. */

export const SITE_ORIGIN = 'https://adaptivityperformance.com';
/** Grasshopper business line — single source of truth for public contact. */
export const SITE_PHONE_DISPLAY = '(940) 304-0620';
/** E.164 for schema / SMS / `tel:` construction */
export const SITE_PHONE_E164 = '+19403040620';
export const SITE_PHONE_DIGITS = '9403040620';
/** Ready for href={SITE_PHONE_TEL} */
export const SITE_PHONE_TEL = `tel:${SITE_PHONE_E164}`;

/** Swap for your live Google Business “Write a review” URL when ready. */
export const GOOGLE_REVIEW_URL =
  (import.meta.env.VITE_GOOGLE_REVIEW_URL as string | undefined)?.trim() ||
  'https://g.page/r/CaIynDu9Qo0SEBM/review';

export type SeoMeta = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_SEO: Record<string, SeoMeta> = {
  home: {
    title: 'Adaptivity Performance | Mechanic Shop & Mobile Auto Repair DFW',
    description:
      `Top-rated mechanic shop & mobile auto repair serving Justin, Northlake, Denton, and Fort Worth DFW. On-site brake repair, diagnostics, starters, and oil changes. Call ${SITE_PHONE_DISPLAY}.`,
    path: '/',
  },
  about: {
    title: 'About Us | Premier Mechanic Shop & Mobile Auto Repair — Adaptivity',
    description:
      'Learn about Adaptivity Performance — Justin TX auto repair shop hub and mobile mechanic fleet delivering transparent on-site automotive care across DFW.',
    path: '/about',
  },
  services: {
    title: 'Auto Repair Services | Mechanic Shop & Mobile Van Dispatch — Adaptivity',
    description:
      'Explore professional auto repair services: brake replacements, engine OBD diagnostics, battery & starter swaps, and synthetic oil changes at your driveway.',
    path: '/services',
  },
  contact: {
    title: 'Contact Us | Auto Repair Mechanic Shop & Mobile Dispatch DFW',
    description:
      `Contact Adaptivity Performance for immediate mechanic shop dispatch, phone quotes, and 24/7 customer support across North Texas. Call ${SITE_PHONE_DISPLAY}.`,
    path: '/contact',
  },
  quotes: {
    title: 'Rough Estimate Calculator | Adaptivity Performance',
    description: 'Ballpark labor + parts for DFW mobile service, then book an $85 diagnostic hold.',
    path: '/quotes',
  },
  coverage: {
    title: 'Service Area | Mobile Mechanic Coverage Across DFW',
    description:
      'Check zip coverage for Justin, Northlake, Fort Worth, Arlington, Frisco, Denton, and more.',
    path: '/coverage',
  },
  faq: {
    title: 'FAQ | Mobile Mechanic Justin & Northlake TX — Adaptivity',
    description:
      'Travel fees, labor rates, warranty, mobile vs shop — answers for Justin and Northlake customers.',
    path: '/faq',
  },
  partners: {
    title: 'Partner Shops & Garages | Adaptivity Performance',
    description: 'Host Adaptivity jobs at your DFW shop or garage. We book, hold cards, and dispatch.',
    path: '/partners',
  },
  join: {
    title: 'Join as a Tech | 1099 Mobile Mechanic Jobs — Adaptivity',
    description: 'Keep 70% of labor. Stripe Express payouts. Apply for DFW mobile dispatch.',
    path: '/join',
  },
  careers: {
    title: 'Careers | Adaptivity Performance',
    description: 'Technician and partner opportunities with Adaptivity Performance in North Texas.',
    path: '/careers',
  },
  membership: {
    title: 'Membership Plans | Adaptivity Performance',
    description: 'Priority dispatch and member perks for DFW drivers.',
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
  blog: {
    title: 'Blog | Mobile Mechanic Tips — Adaptivity Performance',
    description:
      'DFW mobile repair guides: brake pricing, Justin vs dealership, and local service tips for Northlake and beyond.',
    path: '/blog',
  },
  blogPost: {
    title: 'Article | Adaptivity Performance Blog',
    description: 'Mobile mechanic tips and local auto repair guides from Adaptivity Performance.',
    path: '/blog',
  },
};

export type CityLanding = {
  slug: string;
  city: string;
  zips: string[];
  neighborhoods: string;
  blurb: string;
};

export const CITY_LANDINGS: CityLanding[] = [
  {
    slug: 'justin',
    city: 'Justin',
    zips: ['76247'],
    neighborhoods: 'Downtown Justin, Hardeman, Wildcat Ridge',
    blurb:
      'Our Justin hub is the home base for free-radius mobile dispatch. Same-day driveway service for brakes, oil, batteries, and diagnostics.',
  },
  {
    slug: 'northlake',
    city: 'Northlake',
    zips: ['76226', '76262'],
    neighborhoods: 'Canyon Falls, Harvest, Pecan Square, Town Center',
    blurb:
      'Northlake’s go-to mobile mechanic — we come to Canyon Falls, Harvest, and Pecan Square with ASE-level tools and transparent on-site pricing.',
  },
  {
    slug: 'fort-worth',
    city: 'Fort Worth',
    zips: ['76102', '76177', '76131'],
    neighborhoods: 'Alliance, Downtown, North Fort Worth',
    blurb:
      'Mobile auto repair for Fort Worth and Alliance. Book an $85 diagnostic hold and get labor + parts priced on site.',
  },
  {
    slug: 'arlington',
    city: 'Arlington',
    zips: ['76010', '76011', '76015'],
    neighborhoods: 'Central Arlington, Entertainment District corridor',
    blurb:
      'Need a mobile mechanic in Arlington? Adaptivity dispatches certified techs for brakes, oil changes, and check-engine diagnostics.',
  },
  {
    slug: 'frisco',
    city: 'Frisco',
    zips: ['75034', '75035', '75033'],
    neighborhoods: 'Frisco, The Star corridor, west Frisco',
    blurb:
      'Frisco driveway service without the dealership wait. Mobile brakes, fluids, batteries, and full diagnostic visits.',
  },
  {
    slug: 'denton',
    city: 'Denton',
    zips: ['76201', '76205', '76209'],
    neighborhoods: 'Downtown Denton, UNT area, south Denton',
    blurb:
      'Mobile mechanic coverage for Denton. Flat-rate style transparency with an $85 diagnostic hold and on-site repair pricing.',
  },
  {
    slug: 'roanoke',
    city: 'Roanoke',
    zips: ['76262'],
    neighborhoods: 'Town Center, Alliance corridor',
    blurb:
      'Fast mobile dispatch to Roanoke from our Justin hub — free travel inside the local radius for many nearby streets.',
  },
  {
    slug: 'argyle',
    city: 'Argyle',
    zips: ['76227'],
    neighborhoods: 'Village of Argyle, Country Club',
    blurb:
      'Argyle mobile auto repair with clear per-mile travel past our free radius. Book online in minutes.',
  },
  {
    slug: 'haslet',
    city: 'Haslet',
    zips: ['76052'],
    neighborhoods: 'Haslet Town Center, Sendera Ranch',
    blurb:
      'Haslet and Sendera Ranch mobile service — brakes, oil, batteries, and diagnostics at your driveway.',
  },
  {
    slug: 'keller',
    city: 'Keller',
    zips: ['76248', '76262'],
    neighborhoods: 'Keller Town Center, Hidden Lakes, Solana',
    blurb:
      'Mobile mechanic for Keller — driveway brakes, oil, batteries, and diagnostics with a $85 hold and on-site pricing.',
  },
  {
    slug: 'flower-mound',
    city: 'Flower Mound',
    zips: ['75022', '75028'],
    neighborhoods: 'Flower Mound, Lakeside, Bridlewood corridor',
    blurb:
      'Flower Mound mobile auto repair without the shop wait. Book online for same-day driveway service across DFW north.',
  },
  {
    slug: 'southlake',
    city: 'Southlake',
    zips: ['76092'],
    neighborhoods: 'Southlake Town Square, Timarron, Westlake edge',
    blurb:
      'Southlake driveway service from Adaptivity — ASE-level mobile techs, transparent labor + parts after inspection.',
  },
];

export function cityPath(slug: string): string {
  return `/mobile-mechanic-${slug}-tx`;
}

export function cityFromPath(pathname: string): CityLanding | null {
  const m = pathname.match(/\/mobile-mechanic-([a-z0-9-]+)-tx\/?$/i);
  if (!m) return null;
  return CITY_LANDINGS.find((c) => c.slug === m[1].toLowerCase()) ?? null;
}

export function citySeo(city: CityLanding): SeoMeta {
  return {
    title: `Mobile Mechanic ${city.city} TX | Adaptivity Performance`,
    description: `Mobile mechanic in ${city.city}, TX (${city.zips.join(', ')}). ${city.blurb.slice(0, 120)} Call ${SITE_PHONE_DISPLAY}.`,
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
    a: 'Yes. An $85 diagnostic fee applies to all vehicle inspections and check engine light scans. This fee is fully credited toward any repair we perform on the same visit — so if you approve the repair, the diagnostic effectively costs you nothing. If you decline the repair, the $85 covers the technician\'s time and equipment usage.',
  },
  {
    q: 'Do you offer financing or payment plans?',
    a: 'Yes! We partner with Affirm, Klarna, and Afterpay to offer 0% APR Pay-in-4 installment plans on qualifying repair totals. Select your financing option at checkout before confirming your booking. Subject to lender approval and credit terms.',
  },
  {
    q: 'Do you accept cash?',
    a: 'No. Adaptivity Performance is a cashless business. We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) processed securely via Stripe. We also accept Zelle for applicable balances. A card on file is required at booking to place an $85 authorization hold. Cash payments are not accepted under any circumstances.',
  },
  {
    q: 'Why is a credit card hold required before my appointment?',
    a: 'The $85 pre-authorization hold secures your appointment slot and covers our technician\'s drive time to your location. The hold is not a charge — it is released automatically if you cancel within the allowable window. If you approve a repair, the hold is applied toward your final invoice. This protects both you and our technicians from no-shows.',
  },
  {
    q: 'What happens if I need to cancel or reschedule my appointment?',
    a: 'Cancellations made more than 2 hours before the scheduled appointment window are fully refunded with no penalty. Cancellations within 2 hours of the appointment forfeit the $85 diagnostic hold as a late cancellation fee. Same-day no-shows without notice forfeit the full hold. Rescheduling more than 2 hours in advance is always free.',
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
    a: 'Yes! Any accessible paved parking lot with reasonable overhead clearance works for mobile service. We have served vehicles at office campuses, HOA communities, apartment complexes, and retail parking lots across Justin, Northlake, and DFW. We need the property owner or management permission for the location.',
  },
  {
    q: 'Do you offer fleet or HOA community service contracts?',
    a: 'Yes. We offer fleet maintenance contracts for businesses with multiple vehicles and HOA/community partnerships for residential neighborhoods. Fleet pricing includes priority scheduling, discounted labor rates, and monthly invoicing. Contact us directly to discuss a custom fleet or community contract.',
  },

  // BOOKING PROCESS
  {
    q: 'How do I book an appointment?',
    a: `Booking is 100% online — click Book Service on our website, select your service mode (mobile or shop), enter your vehicle details and service address, choose an appointment window, and place a $85 card hold to confirm. You will receive an SMS and email confirmation immediately. For same-day emergency dispatch, call or text us directly at ${SITE_PHONE_DISPLAY}.`,
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

export async function shareAdaptivity(opts?: { title?: string; text?: string; url?: string }) {
  const title = opts?.title || 'Adaptivity Performance';
  const text =
    opts?.text ||
    `Mobile mechanic for Justin, Northlake & DFW — book a $85 diagnostic hold. ${SITE_PHONE_DISPLAY}`;
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
