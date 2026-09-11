/**
 * Per-route JSON-LD. The static block in index.html describes the business as a
 * whole; these builders add the page-specific graph (Service, FAQPage,
 * BreadcrumbList) that lets a landing page rank for its own intent.
 */
import { SITE_ORIGIN, SITE_PHONE_E164 } from './seo';
import {
  LOCAL_HUB,
  cityPathOf,
  priceRangeLabel,
  serviceCityPath,
  type LocalCity,
  type LocalService,
  type ServiceFaq,
} from './localSeo';

export type JsonLdBlock = Record<string, unknown>;

/** Marks the nodes we own, so a re-render replaces them instead of stacking. */
const DYNAMIC_LD_ATTR = 'data-adaptivity-ld';

const BUSINESS_ID = `${SITE_ORIGIN}/#business`;

function absolute(path: string): string {
  return `${SITE_ORIGIN}${path === '/' ? '' : path}`;
}

export function businessReference(): JsonLdBlock {
  return { '@id': BUSINESS_ID };
}

export function buildLocalBusinessLd(city?: LocalCity): JsonLdBlock {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    '@id': BUSINESS_ID,
    name: 'Adaptivity Performance',
    telephone: SITE_PHONE_E164,
    url: SITE_ORIGIN,
    image: `${SITE_ORIGIN}/og-image.png`,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: LOCAL_HUB.city,
      addressRegion: LOCAL_HUB.state,
      postalCode: LOCAL_HUB.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: LOCAL_HUB.lat,
      longitude: LOCAL_HUB.lng,
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: LOCAL_HUB.lat,
        longitude: LOCAL_HUB.lng,
      },
      geoRadius: `${LOCAL_HUB.radiusMiles} mi`,
    },
    ...(city
      ? {
          serviceArea: {
            '@type': 'Place',
            name: `${city.city}, ${LOCAL_HUB.state}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: city.city,
              addressRegion: LOCAL_HUB.state,
              addressCountry: 'US',
            },
          },
        }
      : {}),
  };
}

export function buildServiceLd(service: LocalService, city: LocalCity): JsonLdBlock {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${absolute(serviceCityPath(service.slug, city.slug))}#service`,
    name: `${service.name} in ${city.city}, ${LOCAL_HUB.state}`,
    serviceType: service.name,
    description: service.blurb,
    provider: {
      '@type': 'AutoRepair',
      '@id': BUSINESS_ID,
      name: 'Adaptivity Performance',
      telephone: SITE_PHONE_E164,
    },
    areaServed: {
      '@type': 'City',
      name: city.city,
      containedInPlace: { '@type': 'State', name: 'Texas' },
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: service.priceFrom,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'USD',
        minPrice: service.priceFrom,
        maxPrice: service.priceTo,
        description: `${priceRangeLabel(service)} ${service.priceUnit}`,
      },
      availability: 'https://schema.org/InStock',
      url: absolute(serviceCityPath(service.slug, city.slug)),
    },
  };
}

export function buildFaqLd(faqs: ServiceFaq[]): JsonLdBlock | null {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function buildBreadcrumbLd(trail: { name: string; path: string }[]): JsonLdBlock {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** JSON-LD for a `/mobile-mechanic-{city}-tx` page. */
export function cityJsonLd(city: LocalCity, faqs: ServiceFaq[]): JsonLdBlock[] {
  const blocks: JsonLdBlock[] = [
    buildLocalBusinessLd(city),
    buildBreadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Service area', path: '/coverage' },
      { name: `Mobile mechanic ${city.city}`, path: cityPathOf(city.slug) },
    ]),
  ];
  const faq = buildFaqLd(faqs);
  if (faq) blocks.push(faq);
  return blocks;
}

/** JSON-LD for a `/{service}-{city}-tx` page. */
export function serviceCityJsonLd(
  service: LocalService,
  city: LocalCity,
  faqs: ServiceFaq[]
): JsonLdBlock[] {
  const blocks: JsonLdBlock[] = [
    buildServiceLd(service, city),
    buildBreadcrumbLd([
      { name: 'Home', path: '/' },
      { name: `Mobile mechanic ${city.city}`, path: cityPathOf(city.slug) },
      { name: service.name, path: serviceCityPath(service.slug, city.slug) },
    ]),
  ];
  const faq = buildFaqLd(faqs);
  if (faq) blocks.push(faq);
  return blocks;
}

/** Swap the page-scoped JSON-LD nodes. Static index.html blocks are untouched. */
export function applyJsonLd(blocks: JsonLdBlock[]) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`script[${DYNAMIC_LD_ATTR}]`).forEach((n) => n.remove());
  for (const block of blocks) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(DYNAMIC_LD_ATTR, 'true');
    script.text = JSON.stringify(block);
    document.head.appendChild(script);
  }
}
