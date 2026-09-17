import { useSyncExternalStore } from 'react';
import { cityFromPath } from './seo';
import { serviceCityFromPath } from './localSeo';
import { adLandingFromPath } from './adLandings';

export type SitePage =
  | 'home'
  | 'about'
  | 'services'
  | 'contact'
  | 'membership'
  | 'diagnostics'
  | 'join'
  | 'wantToTeach'
  | 'learn'
  | 'careers'
  | 'partners'
  | 'coverage'
  | 'performance'
  | 'faq'
  | 'city'
  | 'serviceCity'
  | 'adLanding'
  | 'terms'
  | 'privacy'
  | 'refunds'
  | 'notFound'
  | 'referral';

/** Pages addressed by a fixed path segment (everything but the dynamic routes). */
type DynamicFreePage = Exclude<SitePage, 'city' | 'serviceCity' | 'adLanding' | 'referral'>;

const PAGE_SEGMENTS: Record<DynamicFreePage, string> = {
  home: '',
  about: 'about',
  services: 'services',
  contact: 'contact',
  membership: 'membership',
  diagnostics: 'diagnostics',
  join: 'join',
  wantToTeach: 'want-to-teach',
  learn: 'learn',
  careers: 'careers',
  partners: 'partners',
  coverage: 'coverage',
  performance: 'performance',
  faq: 'faq',
  terms: 'terms',
  privacy: 'privacy',
  refunds: 'refund-policy',
  notFound: '404',
};

const SEGMENT_TO_PAGE: Record<string, Exclude<DynamicFreePage, 'home'>> = Object.fromEntries(
  (Object.entries(PAGE_SEGMENTS) as [DynamicFreePage, string][])
    .filter(([, seg]) => seg)
    .map(([page, seg]) => [seg, page])
) as Record<string, Exclude<DynamicFreePage, 'home'>>;

/** Unknown paths that don't match any segment show the 404 page */
export function pageFromSegmentOrNotFound(segment: string): SitePage {
  return SEGMENT_TO_PAGE[segment] || 'notFound';
}

/**
 * Paths that used to be their own page. `/quotes` rendered the identical
 * component as `/services`, so it was duplicate content at two URLs; it now
 * redirects rather than competing with the page it duplicated.
 */
export const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  '/quotes': '/services',
  /* The blog is retired. These three URLs were live and may be indexed, so each
     one points at the page that now answers the same question rather than
     404ing and dropping whatever value it had. */
  '/blog': '/services',
  '/blog/how-much-do-brakes-cost-northlake-tx': '/brake-repair-northlake-tx',
  '/blog/mobile-mechanic-vs-dealership-justin-tx': '/mobile-mechanic-justin-tx',
  '/blog/google-business-review-playbook': '/',
};

/** Legacy homepage anchors → page routes */
const HASH_TO_PAGE: Record<string, SitePage> = {
  about: 'about',
  future: 'about',
  services: 'services',
  estimator: 'services',
  membership: 'membership',
  diagnostics: 'diagnostics',
  partners: 'partners',
  area: 'coverage',
  performance: 'performance',
  careers: 'careers',
  join: 'join',
  'want-to-teach': 'wantToTeach',
  teach: 'wantToTeach',
  learn: 'learn',
  train: 'learn',
  training: 'learn',
  faq: 'faq',
};

function basePrefix(): string {
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function normalizePath(pathname: string): string {
  let path = pathname.replace(/\/$/, '') || '/';
  const base = basePrefix();
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

export type NavigateOpts = { hash?: string; replace?: boolean; slug?: string };

export function sitePath(page: SitePage, hashOrOpts?: string | NavigateOpts): string {
  const opts: NavigateOpts =
    typeof hashOrOpts === 'string' ? { hash: hashOrOpts } : hashOrOpts || {};
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (page === 'city' || page === 'serviceCity' || page === 'adLanding') {
    const cleaned = normalizedBase.replace(/\/+/g, '/');
    return opts.hash ? `${cleaned}#${opts.hash}` : cleaned;
  }


  if (page === 'referral' && opts.slug) {
    const path = `${normalizedBase}r/${opts.slug}`.replace(/\/+/g, '/');
    return opts.hash ? `${path}#${opts.hash}` : path;
  }

  const seg = page === 'referral' ? '' : PAGE_SEGMENTS[page as DynamicFreePage];
  const path = seg ? `${normalizedBase}${seg}` : normalizedBase;
  const cleaned = path.replace(/\/+/g, '/');
  return opts.hash ? `${cleaned}#${opts.hash}` : cleaned;
}

export function readSitePage(): SitePage {
  if (typeof window === 'undefined') return 'home';
  let path = normalizePath(window.location.pathname);
  const redirect = LEGACY_PATH_REDIRECTS[path];
  if (redirect) {
    window.history.replaceState({}, '', redirect);
    path = redirect;
  }
  if (cityFromPath(path)) return 'city';
  if (serviceCityFromPath(path)) return 'serviceCity';
  if (adLandingFromPath(path)) return 'adLanding';
  if (/^\/r\/[A-Za-z0-9_-]{4,16}\/?$/.test(path)) return 'referral';
  if (path === '/refunds' || path === '/refund-policy' || path === '/cancellation-policy') return 'refunds';
  if (path === '/' || path === '') {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && HASH_TO_PAGE[hash]) return HASH_TO_PAGE[hash];
    return 'home';
  }
  const segment = path.replace(/^\//, '').split('/')[0] || '';
  return SEGMENT_TO_PAGE[segment] || 'notFound';
}

function subscribeToRoute(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
  };
}

export function useSitePage(): SitePage {
  return useSyncExternalStore(subscribeToRoute, readSitePage, () => 'home');
}

function readPathname(): string {
  if (typeof window === 'undefined') return '/';
  return normalizePath(window.location.pathname);
}

/** Pathname snapshot so city-to-city navigations re-render when page stays `'city'`. */
export function useSitePathname(): string {
  return useSyncExternalStore(subscribeToRoute, readPathname, () => '/');
}

export function navigateSite(page: SitePage, opts?: NavigateOpts) {
  const url = sitePath(page, opts);
  if (opts?.replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function isMarketingPath(pathname?: string): boolean {
  const path = normalizePath(pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/'));
  if (path === '/portal' || path === '/login' || path === '/admin') return false;
  return true;
}
