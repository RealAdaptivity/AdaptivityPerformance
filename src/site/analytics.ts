/** Optional analytics — set VITE_PLAUSIBLE_DOMAIN and/or VITE_GA4_MEASUREMENT_ID. */

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

  const gaId = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim();
  if (gaId) {
    const gtagSrc = document.createElement('script');
    gtagSrc.async = true;
    gtagSrc.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(gtagSrc);

    const inline = document.createElement('script');
    inline.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', ${JSON.stringify(gaId)});
    `;
    document.head.appendChild(inline);
  }
}

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: EventProps }) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

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
