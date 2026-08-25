/**
 * Helcim API v2 client.
 *
 * Replaces _shared/stripe.ts as the card-processing rail. Deliberately mirrors
 * that module's exported surface (jsonResponse / handleCors / a single request
 * helper) so each edge function's migration is an import swap plus call sites.
 *
 * Helcim differs from Stripe in three ways that shape everything below:
 *   1. JSON in / JSON out — not form-encoded, so there is no flattenParams.
 *   2. Auth is an `api-token` header, not Bearer.
 *   3. Card capture is driven by HelcimPay.js: the browser collects the card and
 *      returns a cardToken, which the backend then charges. There is no
 *      client-secret-style object to confirm server-side.
 */

const HELCIM_API_BASE = 'https://api.helcim.com/v2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * live | test.
 *
 * Helcim API tokens are opaque — unlike Stripe there is no sk_live_/sk_test_
 * prefix to infer from, so the mode must be declared explicitly. Defaults to
 * `test` so a missing env var can never silently move real money.
 */
export function getHelcimMode(): 'live' | 'test' {
  const mode = (Deno.env.get('HELCIM_MODE') || '').toLowerCase();
  if (mode === 'live') return 'live';
  if (mode === 'test') return 'test';
  return 'test';
}

export function getHelcimApiToken(): string {
  const token = Deno.env.get('HELCIM_API_TOKEN');
  if (!token?.trim()) {
    throw new Error('HELCIM_API_TOKEN is not configured on Supabase Edge Functions.');
  }
  return token.trim();
}

/**
 * Fail closed in live mode when webhook verification is not configured, matching
 * the guarantee assertStripeConfigured() gave us.
 */
export function assertHelcimConfigured() {
  const token = getHelcimApiToken();
  if (getHelcimMode() === 'live' && !Deno.env.get('HELCIM_WEBHOOK_VERIFIER_TOKEN')?.trim()) {
    throw new Error(
      'Live Helcim requires HELCIM_WEBHOOK_VERIFIER_TOKEN on Edge Functions (fail-closed).'
    );
  }
  return token;
}

/**
 * Helcim requires the idempotency-key header to be exactly 25 characters.
 * Callers pass a semantic seed (booking ref, payment intent) and we hash it to
 * a stable 25-char value so a retry of the same logical operation dedupes.
 */
export function helcimIdempotencyKey(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  const raw = `${h1.toString(36)}${h2.toString(36)}${seed.replace(/[^a-zA-Z0-9]/g, '')}`;
  return raw.padEnd(25, '0').slice(0, 25);
}

export type HelcimRequestOptions = {
  /** Seed for the idempotency-key header. Omit for reads. */
  idempotencySeed?: string;
};

/**
 * Single entry point for Helcim API calls.
 *
 * Throws on non-2xx with a normalized message. Helcim reports failures in a few
 * different shapes depending on endpoint (`errors` as a string, `errors` as a
 * field map, or a bare `message`), so all three are unwrapped here rather than
 * at each call site.
 */
export async function helcimRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  options: HelcimRequestOptions = {}
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    'api-token': getHelcimApiToken(),
    accept: 'application/json',
  };

  const init: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (options.idempotencySeed) {
    headers['idempotency-key'] = helcimIdempotencyKey(options.idempotencySeed);
  }

  const res = await fetch(`${HELCIM_API_BASE}${path}`, init);
  const text = await res.text();

  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) throw new Error(`Helcim API error (${res.status}): ${text.slice(0, 200)}`);
      throw new Error('Helcim returned a non-JSON response.');
    }
  }

  if (!res.ok) {
    throw new Error(normalizeHelcimError(data, res.status));
  }
  return data;
}

function normalizeHelcimError(data: Record<string, unknown>, status: number): string {
  const errors = data.errors;
  if (typeof errors === 'string' && errors.trim()) return errors;
  if (errors && typeof errors === 'object') {
    const parts = Object.entries(errors as Record<string, unknown>).map(
      ([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : String(msg)}`
    );
    if (parts.length) return parts.join('; ');
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (status === 403) {
    return 'Helcim rejected the API token (403). Check HELCIM_API_TOKEN and its permissions.';
  }
  return `Helcim API error (${status})`;
}

/* ------------------------------------------------------------------ *
 * HelcimPay.js checkout sessions
 * ------------------------------------------------------------------ */

export type HelcimPayPaymentType = 'purchase' | 'preauth' | 'verify';

export type HelcimPayCheckout = {
  checkoutToken: string;
  secretToken: string;
};

/**
 * Open a HelcimPay.js checkout session.
 *
 * `preauth` is the analogue of a Stripe PaymentIntent with manual capture: it
 * places a hold the backend later captures. All three payment types return a
 * reusable cardToken in the transaction response, which is what lets us charge
 * a repair remainder above the original hold without asking for the card again.
 */
export async function initializeHelcimPayCheckout(opts: {
  amount: number;
  currency?: string;
  paymentType: HelcimPayPaymentType;
  /** Surfaces on the customer's statement / Helcim invoice record. */
  invoiceNumber?: string;
  customerCode?: string;
  /** Ask Helcim to persist the card for later off-session charges. */
  saveCard?: boolean;
  idempotencySeed?: string;
}): Promise<HelcimPayCheckout> {
  const body: Record<string, unknown> = {
    paymentType: opts.paymentType,
    amount: Number(opts.amount.toFixed(2)),
    currency: opts.currency ?? 'USD',
  };
  if (opts.invoiceNumber) body.invoiceNumber = opts.invoiceNumber;
  if (opts.customerCode) body.customerCode = opts.customerCode;
  if (opts.saveCard) body.paymentMethod = 'cc';

  const data = await helcimRequest('/helcim-pay/initialize', 'POST', body, {
    idempotencySeed: opts.idempotencySeed,
  });

  const checkoutToken = typeof data.checkoutToken === 'string' ? data.checkoutToken : null;
  const secretToken = typeof data.secretToken === 'string' ? data.secretToken : null;
  if (!checkoutToken || !secretToken) {
    throw new Error('Helcim did not return a checkout session (missing checkoutToken).');
  }
  return { checkoutToken, secretToken };
}

/* ------------------------------------------------------------------ *
 * Payment API
 * ------------------------------------------------------------------ */

export type HelcimTransaction = {
  transactionId: string;
  status: string;
  amount: number;
  cardToken: string | null;
  customerCode: string | null;
  raw: Record<string, unknown>;
};

function toTransaction(data: Record<string, unknown>): HelcimTransaction {
  // Helcim nests the transaction under `transaction` on some endpoints and
  // returns it flat on others; accept either.
  const t = (data.transaction && typeof data.transaction === 'object'
    ? data.transaction
    : data) as Record<string, unknown>;

  const transactionId =
    t.transactionId != null ? String(t.transactionId) : t.id != null ? String(t.id) : '';
  if (!transactionId) {
    throw new Error('Helcim response did not include a transactionId.');
  }

  return {
    transactionId,
    status: typeof t.status === 'string' ? t.status : 'UNKNOWN',
    amount: Number(t.amount ?? 0),
    cardToken: typeof t.cardToken === 'string' ? t.cardToken : null,
    customerCode: typeof t.customerCode === 'string' ? t.customerCode : null,
    raw: t,
  };
}

/** True when Helcim considers the transaction successfully processed. */
export function isHelcimApproved(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'APPROVED' || s === 'COMPLETED' || s === 'CAPTURED';
}

/**
 * Capture a previously authorized preauth.
 *
 * Like Stripe's amount_to_capture, the captured amount may be lower than the
 * authorized amount. It may not exceed it — a repair above the hold is charged
 * separately via chargeWithCardToken().
 */
export async function captureHelcimPreauth(opts: {
  preauthTransactionId: string;
  amount: number;
  ipAddress?: string;
  idempotencySeed?: string;
}): Promise<HelcimTransaction> {
  const data = await helcimRequest(
    '/payment/capture',
    'POST',
    {
      preauthTransactionId: opts.preauthTransactionId,
      amount: Number(opts.amount.toFixed(2)),
      ...(opts.ipAddress ? { ipAddress: opts.ipAddress } : {}),
    },
    { idempotencySeed: opts.idempotencySeed ?? `cap_${opts.preauthTransactionId}` }
  );
  return toTransaction(data);
}

/**
 * Off-session charge against a stored card token — the remainder of a repair
 * above the original diagnostic hold.
 */
export async function chargeWithCardToken(opts: {
  cardToken: string;
  amount: number;
  currency?: string;
  customerCode?: string;
  invoiceNumber?: string;
  ipAddress?: string;
  idempotencySeed?: string;
}): Promise<HelcimTransaction> {
  const body: Record<string, unknown> = {
    paymentType: 'purchase',
    amount: Number(opts.amount.toFixed(2)),
    currency: opts.currency ?? 'USD',
    cardData: { cardToken: opts.cardToken },
  };
  if (opts.customerCode) body.customerCode = opts.customerCode;
  if (opts.invoiceNumber) body.invoiceNumber = opts.invoiceNumber;
  if (opts.ipAddress) body.ipAddress = opts.ipAddress;

  const data = await helcimRequest('/payment/purchase', 'POST', body, {
    idempotencySeed: opts.idempotencySeed,
  });
  return toTransaction(data);
}

/** Partial or full refund of a settled transaction. */
export async function refundHelcimTransaction(opts: {
  originalTransactionId: string;
  amount: number;
  ipAddress?: string;
  idempotencySeed?: string;
}): Promise<HelcimTransaction> {
  const data = await helcimRequest(
    '/payment/refund',
    'POST',
    {
      originalTransactionId: opts.originalTransactionId,
      amount: Number(opts.amount.toFixed(2)),
      ...(opts.ipAddress ? { ipAddress: opts.ipAddress } : {}),
    },
    { idempotencySeed: opts.idempotencySeed }
  );
  return toTransaction(data);
}

/**
 * Release an uncaptured preauth (customer cancelled before work started).
 * Helcim calls this a reverse; it is the analogue of cancelling a Stripe
 * PaymentIntent that is still requires_capture.
 */
export async function reverseHelcimPreauth(opts: {
  cardTransactionId: string;
  ipAddress?: string;
  idempotencySeed?: string;
}): Promise<HelcimTransaction> {
  const data = await helcimRequest(
    '/payment/reverse',
    'POST',
    {
      cardTransactionId: opts.cardTransactionId,
      ...(opts.ipAddress ? { ipAddress: opts.ipAddress } : {}),
    },
    { idempotencySeed: opts.idempotencySeed ?? `rev_${opts.cardTransactionId}` }
  );
  return toTransaction(data);
}

/** Fetch a single transaction (status checks, reconciliation). */
export async function getHelcimTransaction(transactionId: string): Promise<HelcimTransaction> {
  const data = await helcimRequest(`/card-transactions/${transactionId}`, 'GET');
  return toTransaction(data);
}

/* ------------------------------------------------------------------ *
 * Money helpers
 * ------------------------------------------------------------------ */

/**
 * The codebase stores money as integer cents everywhere; Helcim's API takes
 * decimal dollars. Convert only at the API boundary — never carry floats
 * through business logic.
 */
export const centsToAmount = (cents: number): number => Math.round(cents) / 100;
export const amountToCents = (amount: number): number => Math.round(Number(amount) * 100);
