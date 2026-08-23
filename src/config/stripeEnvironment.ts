/**
 * Adaptivity Performance — Stripe Environment Switcher
 * 
 * To switch modes, simply tell Antigravity:
 * "Swap to sandbox"  -> switches to Sandbox (test cards, test payments)
 * "Go live"          -> switches to Live (real cards, real production charges)
 */

export type StripeMode = 'sandbox' | 'live';

// ACTIVE SWITCH: Live Production Mode
export const CURRENT_STRIPE_MODE: StripeMode = 'live';

export const STRIPE_KEYS = {
  sandbox: {
    publishableKey:
      (import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY as string) ||
      'pk_test_51TxEPLAcEv1BPMy8gCacBHwPIkeIYc2MoNGulfzjJ4Dtikvsasfm3tsFcVCC4riTOZxRiqYY6Kq0dKZSs2d3oTZ000kGG5XtUs',
    isLive: false,
    label: 'Sandbox / Test Mode',
  },
  live: {
    publishableKey:
      (import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY as string) ||
      'pk_live_51TxEOnAuv0TG26UbAR0lipc3WJxo5j942RuX13GZpyTP7tUN4PoGVmzwicxgfZwcZhltXh2uavEnVhGvveyiZVZF00tF8MbOma',
    isLive: true,
    label: 'Live / Production Mode',
  },
};

/** Get the currently active publishable key */
export function getActiveStripePublishableKey(): string {
  const envMode = (import.meta.env.VITE_STRIPE_MODE as string)?.toLowerCase();
  const activeMode: StripeMode =
    envMode === 'live' || envMode === 'sandbox' ? envMode : CURRENT_STRIPE_MODE;
  
  const explicitKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
  if (explicitKey?.startsWith('pk_live_') && activeMode === 'live') {
    return explicitKey;
  }
  if (explicitKey?.startsWith('pk_test_') && activeMode === 'sandbox') {
    return explicitKey;
  }
  
  return STRIPE_KEYS[activeMode].publishableKey;
}

/** Check if current mode is live */
export function isStripeLive(): boolean {
  return getActiveStripePublishableKey().startsWith('pk_live_');
}
