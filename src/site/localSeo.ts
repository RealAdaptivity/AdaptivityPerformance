/**
 * Local SEO catalog — Justin hub + 20-mile service radius.
 *
 * `localSeoData.json` is the single source of truth for every indexable local
 * URL. `scripts/generate-sitemap.mjs` reads the same file, so the sitemap and
 * the router can never drift apart.
 */
import data from './localSeoData.json';

export type ServiceFaq = { q: string; a: string };

export type LocalService = {
  slug: string;
  name: string;
  shortName: string;
  keyword: string;
  priceFrom: number;
  priceTo: number;
  priceUnit: string;
  durationLabel: string;
  blurb: string;
  symptoms: string[];
  included: string[];
  faqs: ServiceFaq[];
};

export type LocalCity = {
  slug: string;
  city: string;
  zips: string[];
  neighborhoods: string;
  distanceMiles: number;
  driveMinutes: number;
  servicePages: boolean;
  blurb: string;
};

export type ServiceHub = {
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  freeRadiusMiles: number;
};

export const LOCAL_HUB: ServiceHub = data.hub;
export const LOCAL_SERVICES: LocalService[] = data.services;
export const LOCAL_CITIES: LocalCity[] = data.cities;

/** Cities that get the full service × city matrix (the highest-intent metros). */
export const SERVICE_PAGE_CITIES: LocalCity[] = LOCAL_CITIES.filter((c) => c.servicePages);

const SERVICE_BY_SLUG = new Map(LOCAL_SERVICES.map((s) => [s.slug, s]));
const CITY_BY_SLUG = new Map(LOCAL_CITIES.map((c) => [c.slug, c]));

export function findService(slug: string): LocalService | null {
  return SERVICE_BY_SLUG.get(slug.toLowerCase()) ?? null;
}

export function findCity(slug: string): LocalCity | null {
  return CITY_BY_SLUG.get(slug.toLowerCase()) ?? null;
}

/** `/mobile-mechanic-northlake-tx` */
export function cityPathOf(citySlug: string): string {
  return `/mobile-mechanic-${citySlug}-tx`;
}

/** `/brake-repair-northlake-tx` */
export function serviceCityPath(serviceSlug: string, citySlug: string): string {
  return `/${serviceSlug}-${citySlug}-tx`;
}

export type ServiceCityMatch = { service: LocalService; city: LocalCity };

/**
 * Parse `/{service}-{city}-tx`. Both halves contain hyphens, so we anchor on the
 * known service slugs (longest first) rather than guessing at the split point.
 */
export function serviceCityFromPath(pathname: string): ServiceCityMatch | null {
  const m = pathname.replace(/\/$/, '').match(/^\/([a-z0-9-]+)-tx$/i);
  if (!m) return null;
  const body = m[1].toLowerCase();

  const candidates = [...LOCAL_SERVICES].sort((a, b) => b.slug.length - a.slug.length);
  for (const service of candidates) {
    const prefix = `${service.slug}-`;
    if (!body.startsWith(prefix)) continue;
    const city = findCity(body.slice(prefix.length));
    if (city?.servicePages) return { service, city };
  }
  return null;
}

/** Every service × city URL, in sitemap order. */
export function allServiceCityPaths(): string[] {
  return SERVICE_PAGE_CITIES.flatMap((city) =>
    LOCAL_SERVICES.map((service) => serviceCityPath(service.slug, city.slug))
  );
}

export function priceRangeLabel(service: LocalService): string {
  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;
  return service.priceFrom === service.priceTo
    ? fmt(service.priceFrom)
    : `${fmt(service.priceFrom)} - ${fmt(service.priceTo)}`;
}

/** Travel band for a city, derived from the hub's free radius. */
export function travelBand(city: LocalCity): 'free' | 'per-mile' {
  return city.distanceMiles <= LOCAL_HUB.freeRadiusMiles ? 'free' : 'per-mile';
}

export function travelLabel(city: LocalCity): string {
  return travelBand(city) === 'free'
    ? `No travel fee — ${city.city} is inside our ${LOCAL_HUB.freeRadiusMiles}-mile free radius.`
    : `${city.city} is ${city.distanceMiles} miles out, just past the ${LOCAL_HUB.freeRadiusMiles}-mile free radius, so a small per-mile travel line shows on the quote.`;
}

/** Nearest other cities, for internal linking between landing pages. */
export function nearbyCities(city: LocalCity, limit = 6): LocalCity[] {
  return LOCAL_CITIES.filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, delta: Math.abs(c.distanceMiles - city.distanceMiles) }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Page metadata for a `/{service}-{city}-tx` landing page. */
export function serviceCityMeta(service: LocalService, city: LocalCity) {
  return {
    title: `${service.name} in ${city.city}, TX | ${priceRangeLabel(service)} — Adaptivity`,
    description: `${service.name} at your driveway in ${city.city}, TX (${city.zips.join(', ')}). ${priceRangeLabel(
      service
    )} ${service.priceUnit}, about ${service.durationLabel}. ${city.driveMinutes} minutes from our Justin hub.`,
    path: serviceCityPath(service.slug, city.slug),
  };
}

/**
 * Service FAQs plus two generated from this city's own numbers, so no two
 * landing pages ship the same FAQ block.
 */
export function serviceCityFaqs(service: LocalService, city: LocalCity): ServiceFaq[] {
  const band = travelBand(city);
  return [
    ...service.faqs,
    {
      q: `Do you charge extra to come out to ${city.city}?`,
      a:
        band === 'free'
          ? `No. ${city.city} is ${city.distanceMiles} miles from our Justin hub, inside the ${LOCAL_HUB.freeRadiusMiles}-mile free travel radius, so there is no trip charge on a ${service.keyword} job.`
          : `${city.city} is ${city.distanceMiles} miles out, just past our ${LOCAL_HUB.freeRadiusMiles}-mile free radius, so a $2/mile travel line appears on the quote — roughly $${(
              (city.distanceMiles - LOCAL_HUB.freeRadiusMiles) * 2
            ).toFixed(0)} each way. You see it before you approve anything.`,
    },
    {
      q: `How fast can you get to ${city.city}?`,
      a: `${city.city} is about a ${city.driveMinutes}-minute drive from the hub in Justin. We hold same-day slots most weekdays, and because ${city.city} sits inside our ${LOCAL_HUB.radiusMiles}-mile radius you are not waiting on a van crossing the metro. Neighborhoods we run regularly: ${city.neighborhoods}.`,
    },
  ];
}

/** Other services offered in the same city — internal links that pass authority. */
export function siblingServices(service: LocalService, limit = 7): LocalService[] {
  return LOCAL_SERVICES.filter((s) => s.slug !== service.slug).slice(0, limit);
}

/** The same service in nearby cities. */
export function sameServiceNearby(city: LocalCity, limit = 6): LocalCity[] {
  return SERVICE_PAGE_CITIES.filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, delta: Math.abs(c.distanceMiles - city.distanceMiles) }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit)
    .map((x) => x.c);
}
