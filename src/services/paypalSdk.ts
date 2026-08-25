/**
 * PayPal JS SDK loader.
 *
 * Replaces Stripe Elements. The SDK is loaded once per page with a fixed set of
 * components; because the script URL encodes its configuration (intent,
 * currency, components), a second load with different options would conflict, so
 * the promise is cached and the options are fixed here.
 *
 * `card-fields` is PayPal's hosted card input — it renders number, expiry and
 * CVV into our own containers so the customer never needs a PayPal account and
 * the card never touches our DOM.
 */

import { getPayPalClientId } from '../config/paypalEnvironment';

// The SDK attaches itself to window.paypal. Its own types aren't bundled, so the
// surface we actually use is declared narrowly rather than pulling in `any`.
export interface PayPalCardField {
  render: (selector: string) => Promise<void>;
}

export interface PayPalCardFields {
  isEligible: () => boolean;
  NumberField: () => PayPalCardField;
  ExpiryField: () => PayPalCardField;
  CVVField: () => PayPalCardField;
  submit: () => Promise<void>;
}

export interface PayPalCardFieldsOptions {
  /** Return the order id created server-side. */
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void> | void;
  onError?: (err: unknown) => void;
}

declare global {
  interface Window {
    paypal?: {
      CardFields?: (options: PayPalCardFieldsOptions) => PayPalCardFields;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

export function loadPayPalSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('The PayPal SDK requires a browser environment.'));
  }
  if (window.paypal?.CardFields) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const params = new URLSearchParams({
    'client-id': getPayPalClientId(),
    components: 'card-fields',
    // The booking hold authorizes rather than captures; capture happens later,
    // server-side, when the tech completes the job.
    intent: 'authorize',
    currency: 'USD',
  });
  const src = `https://www.paypal.com/sdk/js?${params.toString()}`;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load the PayPal SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      sdkPromise = null;
      reject(new Error('Could not load the secure payment form. Check your connection and retry.'));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

/**
 * True when this buyer/browser can use hosted card fields.
 *
 * PayPal gates Advanced Card Payments by account eligibility and region, so this
 * can legitimately be false on a correctly configured account. Callers must have
 * something to fall back to rather than showing an empty form.
 */
export function cardFieldsEligible(): boolean {
  return Boolean(window.paypal?.CardFields);
}
