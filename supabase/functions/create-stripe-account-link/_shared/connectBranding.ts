/** Stripe Express onboarding + Financial Connections sidebar branding. */
export const ADAPTIVITY_BRAND = {
  primaryColor: '#f97316',
  secondaryColor: '#0b0c10',
  businessName: 'Adaptivity Performance',
  supportPhone: '2146203244',
} as const;

/** Public marketing / portal host (custom domain). */
export const DEFAULT_PLATFORM_SITE = 'https://adaptivityperformance.com';

function stripPortalPath(pathname: string): string {
  return pathname.replace(/\/portal\/?$/i, '').replace(/\/$/, '') || '/';
}

/** Marketing site root — never include /portal (that breaks default redirect URL builders). */
export function normalizePlatformSite(override?: string): string {
  const fromEnv = Deno.env.get('ADAPTIVITY_SITE_URL')?.trim();
  let candidate = override?.trim() || fromEnv || DEFAULT_PLATFORM_SITE;
  candidate = candidate.split('#')[0].split('?')[0].trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = DEFAULT_PLATFORM_SITE;
  }
  try {
    const u = new URL(candidate);
    const path = stripPortalPath(u.pathname);
    const root = `${u.origin}${path === '/' ? '' : path}`;
    return root.replace(/\/$/, '') || DEFAULT_PLATFORM_SITE;
  } catch {
    return DEFAULT_PLATFORM_SITE;
  }
}

export function platformSiteUrl(override?: string): string {
  return normalizePlatformSite(override);
}

function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

/** business_profile.url must be HTTPS — use prod site when dev sends http://localhost redirects. */
export function stripeBusinessProfileSite(override?: string): string {
  const normalized = normalizePlatformSite(override);
  try {
    const u = new URL(normalized);
    if (u.protocol !== 'https:') return DEFAULT_PLATFORM_SITE;
  } catch {
    return DEFAULT_PLATFORM_SITE;
  }
  return normalized;
}

/** Stripe account_links only accept absolute https URLs (http allowed for localhost in test mode). */
export function isStripeAllowedRedirectUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol === 'https:') return Boolean(u.hostname);
    if (u.protocol === 'http:' && isLocalDevHost(u.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Stripe requires absolute URLs; SPA /portal works on GitHub Pages via 404.html fallback. */
export function techStripeConnectUrlsForSite(site?: string) {
  const root = normalizePlatformSite(site);
  return {
    returnUrl: `${root}/portal?stripeSetup=complete`,
    refreshUrl: `${root}/portal?stripeSetup=refresh`,
  };
}

export function resolveTechStripeConnectRedirectUrls(body: {
  returnUrl?: string;
  refreshUrl?: string;
}): { returnUrl: string; refreshUrl: string } {
  const defaults = techStripeConnectUrlsForSite();
  const pick = (value: unknown, fallback: string) => {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const trimmed = value.trim();
    return isStripeAllowedRedirectUrl(trimmed) ? trimmed : fallback;
  };
  return {
    returnUrl: pick(body.returnUrl, defaults.returnUrl),
    refreshUrl: pick(body.refreshUrl, defaults.refreshUrl),
  };
}

function isValidHttpsAssetUrl(url: string | undefined): url is string {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** Optional PNG/JPG URLs on your public site (Stripe does not accept SVG for Connect branding). */
export function brandImageUrls(_site: string) {
  const customIcon = Deno.env.get('ADAPTIVITY_STRIPE_BRAND_ICON_URL')?.trim();
  const customLogo = Deno.env.get('ADAPTIVITY_STRIPE_BRAND_LOGO_URL')?.trim();
  return {
    icon: isValidHttpsAssetUrl(customIcon) ? customIcon : undefined,
    logo: isValidHttpsAssetUrl(customLogo) ? customLogo : undefined,
  };
}

export function expressAccountCapabilityRequest() {
  return {
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  };
}

export function expressAccountCreatePayload(site: string, email: string, metadata: Record<string, string>) {
  const images = brandImageUrls(site);
  const branding: Record<string, string> = {
    primary_color: ADAPTIVITY_BRAND.primaryColor,
    secondary_color: ADAPTIVITY_BRAND.secondaryColor,
  };
  if (images.icon) branding.icon = images.icon;
  if (images.logo) branding.logo = images.logo;

  const supportEmail =
    Deno.env.get('ADAPTIVITY_SUPPORT_EMAIL')?.trim() || 'hello@adaptivityperformance.com';

  return {
    type: 'express',
    country: 'US',
    email: email.trim(),
    ...expressAccountCapabilityRequest(),
    business_type: 'individual',
    business_profile: {
      name: ADAPTIVITY_BRAND.businessName,
      url: site,
      support_email: supportEmail,
      support_phone: ADAPTIVITY_BRAND.supportPhone,
      product_description: 'Mobile ASE automotive repair & dispatch — technician payouts via Adaptivity.',
    },
    settings: {
      payouts: { schedule: { interval: 'manual' } },
      branding,
    },
    metadata,
  };
}

/** Refresh branding on existing Express accounts before opening account links. */
export function expressAccountBrandingUpdate(site: string) {
  const images = brandImageUrls(site);
  const branding: Record<string, string> = {
    primary_color: ADAPTIVITY_BRAND.primaryColor,
    secondary_color: ADAPTIVITY_BRAND.secondaryColor,
  };
  if (images.icon) branding.icon = images.icon;
  if (images.logo) branding.logo = images.logo;

  const supportEmail =
    Deno.env.get('ADAPTIVITY_SUPPORT_EMAIL')?.trim() || 'hello@adaptivityperformance.com';

  return {
    business_profile: {
      name: ADAPTIVITY_BRAND.businessName,
      url: site,
      support_email: supportEmail,
      support_phone: ADAPTIVITY_BRAND.supportPhone,
    },
    settings: { branding },
  };
}
