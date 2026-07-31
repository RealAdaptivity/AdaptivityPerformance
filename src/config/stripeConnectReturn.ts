import { portalPath } from '../portal/portalRoute';

/** Stripe Connect Express return/refresh URLs (must be absolute HTTPS). */
export const PROD_PORTAL_SITE = 'https://adaptivityperformance.com';

function portalAbsoluteUrl(): string {
  if (typeof window === 'undefined') {
    return `${PROD_PORTAL_SITE}/portal`;
  }
  const path = portalPath().startsWith('/') ? portalPath() : `/${portalPath()}`;
  return new URL(path, window.location.origin).href.replace(/\/$/, '');
}

function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

/** Stripe rejects http:// LAN IPs and non-absolute URLs — use prod HTTPS when needed. */
function stripeSafeRedirectBase(): string {
  const portal = portalAbsoluteUrl();
  try {
    const u = new URL(portal);
    if (u.protocol === 'https:') return portal;
    if (u.protocol === 'http:' && (isLocalDevHost(u.hostname))) {
      return portal;
    }
  } catch {
    /* fall through */
  }
  return `${PROD_PORTAL_SITE}/portal`;
}

export function techStripeConnectUrls(): { returnUrl: string; refreshUrl: string } {
  const base = stripeSafeRedirectBase();
  return {
    returnUrl: `${base}?stripeSetup=complete`,
    refreshUrl: `${base}?stripeSetup=refresh`,
  };
}
