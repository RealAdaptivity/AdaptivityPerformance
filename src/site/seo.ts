/** Site SEO helpers — document title, meta, city landings. */

export const SITE_ORIGIN = 'https://adaptivityperformance.com';
export const SITE_PHONE_DISPLAY = '(214) 620-3244';
export const SITE_PHONE_TEL = '+12146203244';

/** Swap for your live Google Business “Write a review” URL when ready. */
export const GOOGLE_REVIEW_URL =
  (import.meta.env.VITE_GOOGLE_REVIEW_URL as string | undefined)?.trim() ||
  'https://www.google.com/search?q=Adaptivity+Performance+Justin+TX+reviews';

export type SeoMeta = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_SEO: Record<string, SeoMeta> = {
  home: {
    title: 'Adaptivity Performance | Mobile Mechanic Justin TX & Northlake Auto Repair',
    description:
      'Mobile mechanic & auto repair for Justin, Northlake, and DFW. $100 diagnostic hold, on-site pricing, brakes, oil, diagnostics. Call (214) 620-3244.',
    path: '/',
  },
  about: {
    title: 'About Adaptivity Performance | DFW Mobile & Shop Auto Repair',
    description:
      'Independent techs, transparent pricing, and a Justin TX hub serving Northlake, Fort Worth, and North Texas.',
    path: '/about',
  },
  services: {
    title: 'Auto Services | Mobile Brakes, Oil, Diagnostics & More — Adaptivity',
    description:
      'Browse DFW mobile and shop services. On-site labor + parts pricing after a $100 diagnostic hold.',
    path: '/services',
  },
  quotes: {
    title: 'Rough Estimate Calculator | Adaptivity Performance',
    description: 'Ballpark labor + parts for DFW mobile service, then book a $100 diagnostic hold.',
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
      'Mobile auto repair for Fort Worth and Alliance. Book a $100 diagnostic hold and get labor + parts priced on site.',
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
      'Mobile mechanic coverage for Denton. Flat-rate style transparency with a $100 diagnostic hold and on-site repair pricing.',
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
      'Mobile mechanic for Keller — driveway brakes, oil, batteries, and diagnostics with a $100 hold and on-site pricing.',
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
    a: 'Adaptivity Performance operates on a flat, transparent labor rate of $125 per hour for both mobile and in-shop repairs. Specialty German/European vehicles (BMW, Mercedes, Audi) carry a 1.35x specialty multiplier due to European fluid standards and diagnostic coding requirements.',
  },
  {
    q: 'What warranty is included with mobile repairs?',
    a: 'All parts and labor provided by Adaptivity Performance come with a 12-Month / 12,000-Mile Nationwide Warranty. If any issue arises, we return to service your vehicle at zero additional cost.',
  },
  {
    q: 'What is the difference between your mobile service and shop garage location?',
    a: 'Our mobile unit handles on-site services like brake pad/rotor swaps, oil changes, battery replacements, starter/alternator swaps, and computer scans. For major engine overhauls, transmission swaps, truck lifts, and performance upgrades, we drop off your vehicle at our fully equipped Justin garage hub.',
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
    `Mobile mechanic for Justin, Northlake & DFW — book a $100 diagnostic hold. ${SITE_PHONE_DISPLAY}`;
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
