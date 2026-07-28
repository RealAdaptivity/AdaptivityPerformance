import { useSyncExternalStore } from 'react';

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
  | 'faq';

const PAGE_SEGMENTS: Record<SitePage, string> = {
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
};

const SEGMENT_TO_PAGE: Record<string, SitePage> = Object.fromEntries(
  (Object.entries(PAGE_SEGMENTS) as [SitePage, string][])
    .filter(([, seg]) => seg)
    .map(([page, seg]) => [seg, page])
) as Record<string, SitePage>;

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

export function sitePath(page: SitePage, hash?: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const seg = PAGE_SEGMENTS[page];
  const path = seg ? `${normalizedBase}${seg}` : normalizedBase;
  const cleaned = path.replace(/\/+/g, '/');
  return hash ? `${cleaned}#${hash}` : cleaned;
}

export function readSitePage(): SitePage {
  if (typeof window === 'undefined') return 'home';
  const path = normalizePath(window.location.pathname);
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

export function navigateSite(page: SitePage, opts?: { hash?: string; replace?: boolean }) {
  const url = sitePath(page, opts?.hash);
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
