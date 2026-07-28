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
