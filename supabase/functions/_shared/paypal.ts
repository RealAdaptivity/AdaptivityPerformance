/**
 * PayPal REST API client (Orders v2 / Payments v2 / Payouts v1).
 *
 * Third processor for this codebase, after Stripe was closed and Helcim declined.
 * Deliberately mirrors the exported surface of _shared/stripe.ts so each edge
 * function migrates with an import swap plus call sites.
 *
 * Three differences from Stripe shape the module:
 *   1. Auth is an OAuth bearer token minted from client id + secret, not a
 *      long-lived key. Tokens are cached here so every call does not pay for a
 *      round trip.
 *   2. An "order" is not a charge. Authorizing produces an authorization id;
 *      capturing that produces a separate capture id; refunding references the
 *      capture. Three ids where Stripe had a PaymentIntent and a charge.
 *   3. Idempotency is PayPal-Request-Id, and PayPal reuses the *original*
 *      response for a repeated key rather than erroring.
 */

const LIVE_BASE = 'https://api-m.paypal.com';
const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

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
 * live | sandbox.
 *
 * PayPal credentials are opaque — unlike Stripe there is no sk_live_ prefix to
 * infer from, so the mode is declared explicitly and defaults to sandbox. A
 * missing env var must never silently move real money.
 */
export function getPayPalMode(): 'live' | 'sandbox' {
  const mode = (Deno.env.get('PAYPAL_MODE') || '').toLowerCase();
  return mode === 'live' ? 'live' : 'sandbox';
}

export function getPayPalBase(): string {
  return getPayPalMode() === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured on Supabase Edge Functions.'
    );
  }
  return { clientId, clientSecret };
}

/** Fail closed in live mode when webhook verification is not configured. */
export function assertPayPalConfigured() {
  getCredentials();
  if (getPayPalMode() === 'live' && !Deno.env.get('PAYPAL_WEBHOOK_ID')?.trim()) {
    throw new Error('Live PayPal requires PAYPAL_WEBHOOK_ID on Edge Functions (fail-closed).');
  }
}

/* ------------------------------------------------------------------ *
 * OAuth
 * ------------------------------------------------------------------ */

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Mint (or reuse) an access token.
 *
 * Tokens last ~9 hours. Cached in module scope, which on Deno Deploy means per
 * warm isolate — a cold start simply mints a new one. Expiry is shaved by 60s so
 * a token never expires mid-request.
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== 'string') {
    const detail = typeof data.error_description === 'string' ? data.error_description : res.status;
    // Do not cache a failure — the next call should retry cleanly.
    cachedToken = null;
    throw new Error(`PayPal authentication failed (${detail}). Check PAYPAL_CLIENT_ID/SECRET and PAYPAL_MODE.`);
  }

  const ttlSeconds = Number(data.expires_in) || 3600;
  cachedToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + Math.max(0, ttlSeconds - 60) * 1000,
  };
  return cachedToken.token;
}

/* ------------------------------------------------------------------ *
 * Request plumbing
 * ------------------------------------------------------------------ */

export type PayPalRequestOptions = {
  /** Sent as PayPal-Request-Id. A repeat returns the original response. */
  idempotencyKey?: string;
};

export async function paypalRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  options: PayPalRequestOptions = {}
): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (options.idempotencyKey) {
    // PayPal caps this at 38 characters.
    headers['PayPal-Request-Id'] = options.idempotencyKey.slice(0, 38);
  }

  const init: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${getPayPalBase()}${path}`, init);
  const text = await res.text();

  // 204 No Content is success for void/reauthorize-style calls.
  if (!text) {
    if (res.ok) return {};
    throw new Error(`PayPal API error (${res.status}) with empty body`);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`PayPal returned a non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(normalizePayPalError(data, res.status));
  return data;
}

/**
 * PayPal nests the useful part of a failure inside `details[]`, with a
 * `description` per issue. Surfacing only the top-level `message` loses the
 * reason ("INSTRUMENT_DECLINED", "AUTHORIZATION_ALREADY_CAPTURED"), which is
 * exactly what a caller needs to decide what to do.
 */
function normalizePayPalError(data: Record<string, unknown>, status: number): string {
  const parts: string[] = [];
  if (typeof data.name === 'string') parts.push(data.name);
  if (typeof data.message === 'string') parts.push(data.message);

  const details = data.details;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (detail && typeof detail === 'object') {
        const d = detail as Record<string, unknown>;
        const issue = typeof d.issue === 'string' ? d.issue : '';
        const description = typeof d.description === 'string' ? d.description : '';
        const line = [issue, description].filter(Boolean).join(': ');
        if (line) parts.push(line);
      }
    }
  }
  return parts.length > 0 ? parts.join(' — ') : `PayPal API error (${status})`;
}

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

/**
 * The codebase stores money as integer cents; PayPal takes decimal strings.
 * Convert only at the API boundary — never carry floats through business logic.
 */
export const centsToAmount = (cents: number): string => (Math.round(cents) / 100).toFixed(2);
export const amountToCents = (amount: unknown): number =>
  Math.round(Number(amount ?? 0) * 100);

function money(cents: number, currency = 'USD') {
  return { currency_code: currency, value: centsToAmount(cents) };
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

export type PayPalOrder = {
  orderId: string;
  status: string;
  raw: Record<string, unknown>;
};

/**
 * Open an order.
 *
 * `AUTHORIZE` is the analogue of a Stripe PaymentIntent with manual capture and
 * is what the booking hold uses. `CAPTURE` takes the money immediately and is
 * what checkout and payment links use.
 *
 * Note the authorization honor period is 3 days — shorter than the 7 days Stripe
 * gave us. Past that the funds are no longer guaranteed and the authorization
 * must be reauthorized before capture.
 */
export async function createOrder(opts: {
  intent: 'AUTHORIZE' | 'CAPTURE';
  amountCents: number;
  currency?: string;
  /** Shown on the customer's statement and in PayPal's records. */
  invoiceId?: string;
  description?: string;
  /** Store the card for later off-session charges (the repair remainder). */
  vaultCard?: boolean;
  idempotencyKey?: string;
}): Promise<PayPalOrder> {
  const purchaseUnit: Record<string, unknown> = {
    amount: money(opts.amountCents, opts.currency ?? 'USD'),
  };
  if (opts.invoiceId) purchaseUnit.invoice_id = opts.invoiceId;
  if (opts.description) purchaseUnit.description = opts.description.slice(0, 127);

  const body: Record<string, unknown> = {
    intent: opts.intent,
    purchase_units: [purchaseUnit],
  };

  if (opts.vaultCard) {
    body.payment_source = {
      card: {
        attributes: {
          vault: { store_in_vault: 'ON_SUCCESS' },
        },
      },
    };
  }

  const data = await paypalRequest('/v2/checkout/orders', 'POST', body, {
    idempotencyKey: opts.idempotencyKey,
  });
  const orderId = typeof data.id === 'string' ? data.id : '';
  if (!orderId) throw new Error('PayPal did not return an order id.');
  return { orderId, status: String(data.status ?? 'UNKNOWN'), raw: data };
}

export async function getOrder(orderId: string): Promise<PayPalOrder> {
  const data = await paypalRequest(`/v2/checkout/orders/${orderId}`, 'GET');
  return { orderId: String(data.id ?? orderId), status: String(data.status ?? 'UNKNOWN'), raw: data };
}

/* ------------------------------------------------------------------ *
 * Authorizations and captures
 * ------------------------------------------------------------------ */

export type PayPalAuthorization = {
  authorizationId: string;
  status: string;
  amountCents: number;
  /** Vaulted payment token, when the order asked for one. */
  vaultId: string | null;
  /** Funds are only guaranteed until this instant (~3 days). */
  expirationTime: string | null;
  raw: Record<string, unknown>;
};

/** Pull the authorization out of an order's nested payments block. */
export function authorizationFromOrder(order: Record<string, unknown>): PayPalAuthorization | null {
  const units = order.purchase_units;
  if (!Array.isArray(units) || units.length === 0) return null;
  const unit = units[0] as Record<string, unknown>;
  const payments = unit.payments as Record<string, unknown> | undefined;
  const auths = payments?.authorizations;
  if (!Array.isArray(auths) || auths.length === 0) return null;

  const auth = auths[0] as Record<string, unknown>;
  const amount = auth.amount as Record<string, unknown> | undefined;

  // The vault id lives on the order's payment_source, not the authorization.
  let vaultId: string | null = null;
  const source = order.payment_source as Record<string, unknown> | undefined;
  const card = source?.card as Record<string, unknown> | undefined;
  const vault = card?.attributes
    ? ((card.attributes as Record<string, unknown>).vault as Record<string, unknown> | undefined)
    : undefined;
  if (vault && typeof vault.id === 'string') vaultId = vault.id;

  return {
    authorizationId: String(auth.id ?? ''),
    status: String(auth.status ?? 'UNKNOWN'),
    amountCents: amountToCents(amount?.value),
    vaultId,
    expirationTime: typeof auth.expiration_time === 'string' ? auth.expiration_time : null,
    raw: auth,
  };
}

export type PayPalCapture = {
  captureId: string;
  status: string;
  amountCents: number;
  raw: Record<string, unknown>;
};

/**
 * Capture an authorization.
 *
 * `final_capture` tells PayPal no further capture will follow, which releases
 * any authorized-but-uncaptured remainder back to the customer instead of
 * leaving it pending on their card.
 */
export async function captureAuthorization(opts: {
  authorizationId: string;
  amountCents: number;
  currency?: string;
  invoiceId?: string;
  finalCapture?: boolean;
  idempotencyKey?: string;
}): Promise<PayPalCapture> {
  const body: Record<string, unknown> = {
    amount: money(opts.amountCents, opts.currency ?? 'USD'),
    final_capture: opts.finalCapture ?? true,
  };
  if (opts.invoiceId) body.invoice_id = opts.invoiceId;

  const data = await paypalRequest(
    `/v2/payments/authorizations/${opts.authorizationId}/capture`,
    'POST',
    body,
    { idempotencyKey: opts.idempotencyKey }
  );
  return toCapture(data);
}

/** Release an uncaptured authorization (customer cancelled before work began). */
export async function voidAuthorization(authorizationId: string): Promise<void> {
  await paypalRequest(`/v2/payments/authorizations/${authorizationId}/void`, 'POST');
}

/**
 * Extend an authorization past its 3-day honor period.
 *
 * PayPal only permits this from day 4 onward, and it can be declined — the
 * issuer may no longer have the funds reserved. Callers must treat failure as
 * "the hold is gone", not as a transient error.
 */
export async function reauthorize(opts: {
  authorizationId: string;
  amountCents: number;
  currency?: string;
}): Promise<PayPalAuthorization> {
  const data = await paypalRequest(
    `/v2/payments/authorizations/${opts.authorizationId}/reauthorize`,
    'POST',
    { amount: money(opts.amountCents, opts.currency ?? 'USD') }
  );
  const amount = data.amount as Record<string, unknown> | undefined;
  return {
    authorizationId: String(data.id ?? opts.authorizationId),
    status: String(data.status ?? 'UNKNOWN'),
    amountCents: amountToCents(amount?.value),
    vaultId: null,
    expirationTime: typeof data.expiration_time === 'string' ? data.expiration_time : null,
    raw: data,
  };
}

function toCapture(data: Record<string, unknown>): PayPalCapture {
  const captureId = typeof data.id === 'string' ? data.id : '';
  if (!captureId) throw new Error('PayPal response did not include a capture id.');
  const amount = data.amount as Record<string, unknown> | undefined;
  return {
    captureId,
    status: String(data.status ?? 'UNKNOWN'),
    amountCents: amountToCents(amount?.value),
    raw: data,
  };
}

/** True when PayPal considers the object successfully settled or held. */
export function isPayPalOk(status: string): boolean {
  const s = status.toUpperCase();
  return s === 'COMPLETED' || s === 'CAPTURED' || s === 'CREATED' || s === 'APPROVED';
}

/**
 * Charge a stored card off-session — the repair remainder above the hold.
 *
 * Creates and captures an order in one call against the vault token saved when
 * the hold was taken, so the customer never re-enters a card at the roadside.
 */
export async function chargeVaultedCard(opts: {
  vaultId: string;
  amountCents: number;
  currency?: string;
  invoiceId?: string;
  description?: string;
  idempotencyKey?: string;
}): Promise<PayPalCapture> {
  const purchaseUnit: Record<string, unknown> = {
    amount: money(opts.amountCents, opts.currency ?? 'USD'),
  };
  if (opts.invoiceId) purchaseUnit.invoice_id = opts.invoiceId;
  if (opts.description) purchaseUnit.description = opts.description.slice(0, 127);

  const data = await paypalRequest(
    '/v2/checkout/orders',
    'POST',
    {
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      payment_source: { card: { vault_id: opts.vaultId } },
    },
    { idempotencyKey: opts.idempotencyKey }
  );

  // An order created against a vault token settles inline; dig the capture out.
  const units = data.purchase_units;
  if (Array.isArray(units) && units.length > 0) {
    const unit = units[0] as Record<string, unknown>;
    const payments = unit.payments as Record<string, unknown> | undefined;
    const captures = payments?.captures;
    if (Array.isArray(captures) && captures.length > 0) {
      return toCapture(captures[0] as Record<string, unknown>);
    }
  }
  throw new Error(
    `Vaulted-card charge did not produce a capture (order status: ${String(data.status ?? 'unknown')}).`
  );
}

/** Partial or full refund of a settled capture. */
export async function refundCapture(opts: {
  captureId: string;
  amountCents?: number;
  currency?: string;
  invoiceId?: string;
  idempotencyKey?: string;
}): Promise<{ refundId: string; status: string; amountCents: number }> {
  const body: Record<string, unknown> = {};
  // Omitting amount refunds the capture in full.
  if (typeof opts.amountCents === 'number') {
    body.amount = money(opts.amountCents, opts.currency ?? 'USD');
  }
  if (opts.invoiceId) body.invoice_id = opts.invoiceId;

  const data = await paypalRequest(`/v2/payments/captures/${opts.captureId}/refund`, 'POST', body, {
    idempotencyKey: opts.idempotencyKey,
  });
  const amount = data.amount as Record<string, unknown> | undefined;
  return {
    refundId: String(data.id ?? ''),
    status: String(data.status ?? 'UNKNOWN'),
    amountCents: amountToCents(amount?.value),
  };
}
