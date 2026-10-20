/** Analytics, only with consent.
 *
 *  Google Analytics sets cookies, so it loads only once the visitor taps
 *  Accept on the cookie bar; Decline means it never loads. The GA4 tag lives
 *  in index.html (loadGoogleAnalytics). Plausible sets no cookies and loads
 *  when VITE_PLAUSIBLE_DOMAIN is set. */

export const CONSENT_KEY = 'adaptivity_cookie_consent';

export type ConsentChoice = 'accepted' | 'declined';

export function storedConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: EventProps }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    /** Defined in index.html. */
    loadGoogleAnalytics?: () => void;
  }
}

/** A second GA4 property from the environment, held to the same consent. */
function loadEnvGoogleAnalytics() {
  const gaId = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim();
  if (!gaId || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads Arguments objects off the data layer, not arrays.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', gaId);
}

/** Record the visitor's choice; Accept starts Google Analytics now. */
export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* private mode: the choice lasts for this page view only */
  }
  if (choice === 'accepted') {
    window.loadGoogleAnalytics?.();
    loadEnvGoogleAnalytics();
  }
}

export function initSiteAnalytics() {
  if (typeof document === 'undefined') return;

  const plausibleDomain = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim();
  if (plausibleDomain) {
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = plausibleDomain;
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }

  if (storedConsent() === 'accepted') loadEnvGoogleAnalytics();
}

type EventProps = Record<string, string | number | boolean>;

/**
 * Fire a conversion event to whichever analytics provider is configured.
 * No-ops silently when neither is set, so call sites never need a guard.
 */
export function trackEvent(event: string, props?: EventProps) {
  if (typeof window === 'undefined') return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
    window.gtag?.('event', event, props ?? {});
  } catch {
    /* analytics must never break a booking flow */
  }
}

/** The events worth optimizing against — keep names stable for reporting. */
export const CONVERSION_EVENTS = {
  bookingOpened: 'booking_opened',
  callClicked: 'call_clicked',
  textClicked: 'text_clicked',
  quoteStarted: 'quote_started',
  referralShared: 'referral_shared',
  referralLanded: 'referral_landed',
  reviewClicked: 'review_clicked',
  serviceCityView: 'service_city_view',
  adLandingView: 'ad_landing_view',
} as const;
