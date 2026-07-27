import { useSyncExternalStore } from 'react';

function readPortalRouteFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/portal' || path.endsWith('/portal')) return true;
  if (path === '/login' || path.endsWith('/login')) return true;
  return window.location.search.includes('view=portal');
}

function subscribeToRoute(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
  };
}

export function isPortalRoute(): boolean {
  return readPortalRouteFlag();
}

export function usePortalRoute(): boolean {
  return useSyncExternalStore(subscribeToRoute, readPortalRouteFlag, () => false);
}

export function portalPath(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}portal`.replace(/\/+/g, '/');
}

export function navigateToPortal() {
  window.location.href = portalPath();
}

export function navigateToMarketingSite() {
  const base = import.meta.env.BASE_URL || '/';
  window.location.href = base;
}
