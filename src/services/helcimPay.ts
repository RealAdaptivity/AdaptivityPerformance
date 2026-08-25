/**
 * HelcimPay.js loader and modal driver.
 *
 * Replaces Stripe Elements. The difference that shapes this module: Elements
 * renders card fields *inside* our form and hands back a confirmed
 * PaymentIntent. HelcimPay.js opens its own hosted iframe modal and reports the
 * outcome by posting a window message. So instead of a React component tree we
 * need a script loader, a modal launcher, and a message listener — wrapped here
 * into a single promise so callers can just `await`.
 *
 * Nothing this module returns is trusted as proof of payment. The transaction id
 * it surfaces is sent to confirm-booking-hold, which re-fetches the transaction
 * from Helcim server-side and validates it. A tampered message can therefore
 * only cause a rejected confirmation, never a recorded hold.
 */

const HELCIM_PAY_SCRIPT = 'https://secure.helcim.app/helcim-pay/services/start.js';

declare global {
  interface Window {
    appendHelcimPayIframe?: (checkoutToken: string, hideExitButton?: boolean) => void;
    removeHelcimPayIframe?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load HelcimPay.js once and cache the promise for subsequent calls. */
export function loadHelcimPay(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('HelcimPay.js requires a browser environment.'));
  }
  if (window.appendHelcimPayIframe) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${HELCIM_PAY_SCRIPT}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load HelcimPay.js')));
      return;
    }
    const script = document.createElement('script');
    script.src = HELCIM_PAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error('Could not load the secure payment form. Check your connection and retry.'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export type HelcimPayResult = {
  transactionId: string;
  /** Present when the session vaulted the card. */
  cardToken: string | null;
  raw: unknown;
};

/**
 * Walk an arbitrarily nested response for a field, case-insensitively.
 *
 * Helcim nests the transaction differently across payment types and wraps it in
 * a `data` envelope that has itself changed shape between releases. Rather than
 * hard-code one path and break on the others, search for the field. The backend
 * revalidates whatever comes out, so a wrong guess fails safe.
 */
function findField(value: unknown, field: string, depth = 0): string | null {
  if (depth > 6 || value == null) return null;

  if (typeof value === 'string') {
    // A JSON string envelope — Helcim sends eventMessage as a string sometimes.
    if (value.trim().startsWith('{')) {
      try {
        return findField(JSON.parse(value), field, depth + 1);
      } catch {
        return null;
      }
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findField(item, field, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const target = field.toLowerCase();
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key.toLowerCase() === target && (typeof val === 'string' || typeof val === 'number')) {
      const str = String(val).trim();
      if (str) return str;
    }
  }
  for (const val of Object.values(value as Record<string, unknown>)) {
    const found = findField(val, field, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Open the HelcimPay.js modal and resolve once the customer completes it.
 *
 * Rejects if they close the modal or the transaction is declined, so callers can
 * treat rejection as "no card was captured" without inspecting a status.
 */
export function openHelcimPayModal(checkoutToken: string): Promise<HelcimPayResult> {
  return new Promise<HelcimPayResult>((resolve, reject) => {
    if (!window.appendHelcimPayIframe) {
      reject(new Error('HelcimPay.js is not loaded.'));
      return;
    }

    // Helcim namespaces its postMessage by checkout token, so a stale listener
    // from a previous attempt can never resolve this one.
    const eventName = `helcim-pay-js-${checkoutToken}`;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      try {
        window.removeHelcimPayIframe?.();
      } catch {
        /* modal already torn down */
      }
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { eventName?: string; eventStatus?: string; eventMessage?: unknown };
      if (!data || data.eventName !== eventName) return;

      if (data.eventStatus === 'ABORTED') {
        cleanup();
        reject(new Error('Card entry was cancelled.'));
        return;
      }

      if (data.eventStatus === 'SUCCESS') {
        const transactionId = findField(data.eventMessage, 'transactionId');
        if (!transactionId) {
          cleanup();
          reject(
            new Error('The payment form did not return a transaction reference. Please try again.')
          );
          return;
        }
        cleanup();
        resolve({
          transactionId,
          cardToken: findField(data.eventMessage, 'cardToken'),
          raw: data.eventMessage,
        });
      }
    };

    window.addEventListener('message', onMessage);
    window.appendHelcimPayIframe(checkoutToken);
  });
}
