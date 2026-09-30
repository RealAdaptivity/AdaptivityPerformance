import { invokeEdgeFunction } from './edgeFunctionErrors';
import type { RecordedPayment } from './jobPayments';

/**
 * Card payments from the web tech portal through the Square Point of Sale app
 * (Square's Point of Sale API for mobile web).
 *
 * The portal opens Square Point of Sale with the amount; the tech takes the
 * card there (Tap to Pay or a Square reader); Square sends the phone back to
 * the portal with the sale's transaction id. The portal then asks
 * record-square-payment to check the payment with Square and close the job.
 *
 * Leaving the page for Square loses React state, so the close-out (lines,
 * signature path, totals) waits in localStorage until the phone comes back.
 *
 * Formats follow Square's Point of Sale SDKs (iOS: SCCAPIRequest, API 1.3;
 * Android: PosApi, API v2.0).
 */

/** Public Square application id (the same production id the tech app uses). */
export const SQUARE_APPLICATION_ID =
  (import.meta.env.VITE_SQUARE_APPLICATION_ID as string | undefined)?.trim() || 'sq0idp-pU_zEjHaGz0e8hxNwuDj2A';

const PENDING_KEY = 'squarePosPending:v1';

/** Must match a Web callback URL in the Square Developer Console exactly. */
export function squareCallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const path = `${base.endsWith('/') ? base : `${base}/`}portal/`;
  return `${window.location.origin}${path}`;
}

export type SquarePlatform = 'ios' | 'android' | null;

export function squarePlatform(): SquarePlatform {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  // iPadOS reports itself as a Mac; touch support tells it apart.
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return null;
}

export type PendingSquareSale = {
  bookingId: string;
  referenceCode: string;
  totalCents: number;
  /** record_job_payment body (with the saved signature path). */
  payment: Record<string, unknown>;
  startedAt: number;
};

export function savePendingSale(p: PendingSquareSale): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}

export function loadPendingSale(): PendingSquareSale | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingSquareSale;
    // A day-old hand-off is stale; the server would refuse it anyway.
    if (!p?.bookingId || Date.now() - p.startedAt > 24 * 60 * 60 * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearPendingSale(): void {
  localStorage.removeItem(PENDING_KEY);
}

/** The link that opens Square Point of Sale to charge `amountCents`. */
export function squareChargeUrl(opts: {
  platform: Exclude<SquarePlatform, null>;
  amountCents: number;
  bookingId: string;
  referenceCode: string;
}): string {
  const callbackUrl = squareCallbackUrl();
  const note = `Job ${opts.referenceCode}`.slice(0, 500);
  if (opts.platform === 'ios') {
    const data = {
      amount_money: { amount: opts.amountCents, currency_code: 'USD' },
      callback_url: callbackUrl,
      client_id: SQUARE_APPLICATION_ID,
      version: '1.3',
      notes: note,
      state: opts.bookingId,
      options: { supported_tender_types: ['CREDIT_CARD'], auto_return: true },
    };
    return `square-commerce-v1://payment/create?data=${encodeURIComponent(JSON.stringify(data))}`;
  }
  const extra = (k: string, v: string) => `S.com.squareup.pos.${k}=${encodeURIComponent(v)}`;
  return (
    'intent:#Intent;action=com.squareup.pos.action.CHARGE;package=com.squareup;' +
    [
      extra('WEB_CALLBACK_URI', callbackUrl),
      extra('CLIENT_ID', SQUARE_APPLICATION_ID),
      extra('API_VERSION', 'v2.0'),
      `i.com.squareup.pos.TOTAL_AMOUNT=${opts.amountCents}`,
      extra('CURRENCY_CODE', 'USD'),
      extra('TENDER_TYPES', 'com.squareup.pos.TENDER_CARD'),
      extra('NOTE', note),
      extra('REQUEST_METADATA', opts.bookingId),
    ].join(';') +
    ';end'
  );
}

export type SquareReturn =
  | { ok: true; transactionId: string; bookingId: string | null }
  | { ok: false; message: string; bookingId: string | null };

const ERROR_TEXT: Record<string, string> = {
  payment_canceled: 'The payment was canceled in Square.',
  not_logged_in: 'Sign in to Square Point of Sale on this phone first.',
  user_not_active: 'This Square account can’t take payments yet.',
  no_network_connection: 'No internet connection — check signal and try again.',
  location_id_mismatch: 'Square Point of Sale is set to a different location.',
  client_not_authorized_for_user: 'This Square account hasn’t allowed the web portal to take payments.',
  unsupported_api_version: 'Update the Square Point of Sale app and try again.',
  TRANSACTION_CANCELED: 'The payment was canceled in Square.',
  ERROR_TRANSACTION_CANCELED: 'The payment was canceled in Square.',
  ERROR_NO_EMPLOYEE_LOGGED_IN: 'Sign in to Square Point of Sale on this phone first.',
  ERROR_NO_NETWORK: 'No internet connection — check signal and try again.',
  ERROR_UNSUPPORTED_API_VERSION: 'Update the Square Point of Sale app and try again.',
};

function describeError(code: string, description?: string | null): string {
  const short = code.replace(/^com\.squareup\.pos\./, '');
  return ERROR_TEXT[short] || description || `Square didn’t complete the payment (${short}).`;
}

/** Square's answer when the phone comes back to the portal, or null when the
 *  page wasn't opened by Square. */
export function readSquareReturn(search: string): SquareReturn | null {
  const q = new URLSearchParams(search);
  const iosData = q.get('data');
  if (iosData) {
    try {
      const d = JSON.parse(iosData) as {
        status?: string;
        transaction_id?: string;
        error_code?: string;
        state?: string;
      };
      const bookingId = d.state || null;
      if (d.status === 'ok' && d.transaction_id) return { ok: true, transactionId: d.transaction_id, bookingId };
      if (d.status === 'ok') {
        return { ok: false, bookingId, message: 'Square took the payment offline. Close the job once it syncs, from Square’s receipt.' };
      }
      return { ok: false, bookingId, message: describeError(d.error_code || 'unknown') };
    } catch {
      return null;
    }
  }
  const txn = q.get('com.squareup.pos.SERVER_TRANSACTION_ID');
  const err = q.get('com.squareup.pos.ERROR_CODE');
  const meta = q.get('com.squareup.pos.REQUEST_METADATA');
  if (txn) return { ok: true, transactionId: txn, bookingId: meta };
  if (err) return { ok: false, bookingId: meta, message: describeError(err, q.get('com.squareup.pos.ERROR_DESCRIPTION')) };
  if (q.get('com.squareup.pos.CLIENT_TRANSACTION_ID')) {
    return { ok: false, bookingId: meta, message: 'Square took the payment offline. Close the job once it syncs, from Square’s receipt.' };
  }
  return null;
}

/** Remove Square's parameters from the address bar (so a reload doesn't
 *  replay them), keeping the portal route. */
export function clearSquareReturnFromUrl(): void {
  const url = new URL(window.location.href);
  for (const k of [...url.searchParams.keys()]) {
    if (k === 'data' || k.startsWith('com.squareup.pos.')) url.searchParams.delete(k);
  }
  window.history.replaceState(null, '', url.toString());
}

/** Check the sale with Square and close the job. Safe to retry. */
export function recordSquareSale(pending: PendingSquareSale, transactionId: string): Promise<RecordedPayment> {
  return invokeEdgeFunction<RecordedPayment>('record-square-payment', {
    bookingId: pending.bookingId,
    squareOrderId: transactionId,
    payment: pending.payment,
  });
}
