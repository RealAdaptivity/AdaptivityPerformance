/**
 * Adaptivity Performance — Stripe Environment Switcher
 * 
 * To switch modes, simply tell Antigravity:
 * "Swap to sandbox"  -> switches to Sandbox (test cards, test payments)
 * "Go live"          -> switches to Live (real cards, real production charges)
 */

export type StripeMode = 'sandbox' | 'live';

// ACTIVE SWITCH: Sandbox Test Mode
export const CURRENT_STRIPE_MODE: StripeMode = 'sandbox';

export const STRIPE_KEYS = {
  sandbox: {
    publishableKey:
      (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) ||
      (import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY as string) ||
      'pk_test_51U8QWuKI2Be2I3swb1ljHt7EcItyuRneYbkFJnelAFwEPMN3M3OMNfVv7kxwVXbaRQ5AjGhZnbZVi219vJYfvC4B00gVygnHri',
    isLive: false,
    label: 'Sandbox / Test Mode',
  },
  live: {
    publishableKey:
      (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) ||
      (import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY as string) ||
      '',
    isLive: true,
    label: 'Live / Production Mode',
  },
};

/** Get the currently active publishable key */
export function getActiveStripePublishableKey(): string {
  const explicitKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)?.trim();
  if (explicitKey) {
    return explicitKey;
  }

  const envMode = (import.meta.env.VITE_STRIPE_MODE as string)?.toLowerCase();
  const activeMode: StripeMode =
    envMode === 'live' || envMode === 'sandbox' ? envMode : CURRENT_STRIPE_MODE;
  
  return STRIPE_KEYS[activeMode].publishableKey;
}

/** Check if current mode is live */
export function isStripeLive(): boolean {
  return getActiveStripePublishableKey().startsWith('pk_live_');
}
