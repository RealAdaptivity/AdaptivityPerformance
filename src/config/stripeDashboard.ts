/** Stripe Dashboard deep links (test vs live from publishable key). */
const publishable =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

export function stripeDashboardMode(): 'test' | 'live' {
  return publishable.startsWith('pk_live_') ? 'live' : 'test';
}

export function stripePaymentIntentDashboardUrl(paymentIntentId: string): string {
  const mode = stripeDashboardMode();
  return `https://dashboard.stripe.com/${mode}/payments/${paymentIntentId}`;
}

export function stripeConnectAccountDashboardUrl(accountId: string): string {
  const mode = stripeDashboardMode();
  return `https://dashboard.stripe.com/${mode}/connect/accounts/${accountId}`;
}

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function openStreetMapEmbedUrl(lat: number, lng: number, zoom = 11): string {
  const delta = 0.08 / (zoom / 10);
  const minLon = lng - delta;
  const maxLon = lng + delta;
  const minLat = lat - delta * 0.7;
  const maxLat = lat + delta * 0.7;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Adaptivity Justin hub — fallback map center when jobs have no GPS yet. */
export const DISPATCH_HUB = { lat: 33.0848, lng: -97.2961, label: 'Adaptivity Justin hub' };
