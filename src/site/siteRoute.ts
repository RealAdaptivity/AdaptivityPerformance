import { useSyncExternalStore } from 'react';
import { cityFromPath } from './seo';
import { blogSlugFromPath } from '../services/blog';

export type SitePage =
  | 'home'
  | 'about'
  | 'services'
  | 'quotes'
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
  | 'blog'
  | 'blogPost'
  | 'city'
  | 'terms'
  | 'referral';

const PAGE_SEGMENTS: Record<Exclude<SitePage, 'city' | 'blogPost' | 'referral'>, string> = {
  home: '',
  about: 'about',
  services: 'services',
  quotes: 'quotes',
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
  blog: 'blog',
  terms: 'terms',
};

const SEGMENT_TO_PAGE: Record<string, Exclude<SitePage, 'city' | 'blogPost' | 'referral' | 'home'>> = Object.fromEntries(
  (Object.entries(PAGE_SEGMENTS) as [Exclude<SitePage, 'city' | 'blogPost' | 'referral'>, string][])
    .filter(([, seg]) => seg)
    .map(([page, seg]) => [seg, page])
) as Record<string, Exclude<SitePage, 'city' | 'blogPost' | 'referral' | 'home'>>;

/** Legacy homepage anchors → page routes */
const HASH_TO_PAGE: Record<string, SitePage> = {
  about: 'about',
  future: 'about',
  services: 'services',
  estimator: 'quotes',
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
  blog: 'blog',
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

  if (page === 'city') {
    const cleaned = normalizedBase.replace(/\/+/g, '/');
    return opts.hash ? `${cleaned}#${opts.hash}` : cleaned;
  }

  if (page === 'blogPost' && opts.slug) {
    const path = `${normalizedBase}blog/${opts.slug}`.replace(/\/+/g, '/');
    return opts.hash ? `${path}#${opts.hash}` : path;
  }

  if (page === 'referral' && opts.slug) {
    const path = `${normalizedBase}r/${opts.slug}`.replace(/\/+/g, '/');
    return opts.hash ? `${path}#${opts.hash}` : path;
  }

  const seg =
    page === 'blogPost'
      ? 'blog'
      : page === 'referral'
        ? ''
        : PAGE_SEGMENTS[page as Exclude<SitePage, 'city' | 'blogPost' | 'referral'>];
  const path = seg ? `${normalizedBase}${seg}` : normalizedBase;
  const cleaned = path.replace(/\/+/g, '/');
  return opts.hash ? `${cleaned}#${opts.hash}` : cleaned;
}

export function readSitePage(): SitePage {
  if (typeof window === 'undefined') return 'home';
  const path = normalizePath(window.location.pathname);
  if (cityFromPath(path)) return 'city';
  if (/^\/r\/[A-Za-z0-9_-]{4,16}\/?$/.test(path)) return 'referral';
  if (blogSlugFromPath(path)) return 'blogPost';
  if (path === '/blog') return 'blog';
  if (path === '/' || path === '') {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && HASH_TO_PAGE[hash]) return HASH_TO_PAGE[hash];
    return 'home';
  }
  const segment = path.replace(/^\//, '').split('/')[0] || '';
  return SEGMENT_TO_PAGE[segment] || 'home';
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
