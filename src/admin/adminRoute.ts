import { useSyncExternalStore } from 'react';

function readAdminRouteFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/admin' || path.endsWith('/admin')) return true;
  return window.location.search.includes('view=admin');
}

function subscribeToRoute(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
  };
}

/** True when the SPA should render the dispatch admin console instead of the marketing site. */
export function isAdminConsoleRoute(): boolean {
  return readAdminRouteFlag();
}

/** Re-renders when the user navigates to/from /admin (popstate or full load). */
export function useAdminConsoleRoute(): boolean {
  return useSyncExternalStore(subscribeToRoute, readAdminRouteFlag, () => false);
}
