/**
 * PayPal client configuration.
 *
 * Only the client id lives here — it is a public value, safe in the bundle. The
 * secret never leaves Supabase Edge Function secrets.
 *
 * Unlike stripeEnvironment.ts this deliberately has no hardcoded fallback key.
 * A missing env var should fail loudly at setup rather than silently pointing
 * production at whatever credential happened to be committed.
 */

export type PayPalMode = 'sandbox' | 'live';

export const PAYPAL_MODE: PayPalMode =
  (import.meta.env.VITE_PAYPAL_MODE as PayPalMode) === 'live' ? 'live' : 'sandbox';

export function getPayPalClientId(): string {
  const key =
    PAYPAL_MODE === 'live'
      ? (import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID as string)
      : (import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID as string);

  if (!key?.trim()) {
    throw new Error(
      `VITE_PAYPAL_${PAYPAL_MODE === 'live' ? 'LIVE' : 'SANDBOX'}_CLIENT_ID is not set. ` +
        'Add it to your .env and rebuild.'
    );
  }
  return key.trim();
}

export const IS_PAYPAL_LIVE = PAYPAL_MODE === 'live';
