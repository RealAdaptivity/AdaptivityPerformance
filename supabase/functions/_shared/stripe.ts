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

/** live | test — derived from STRIPE_SECRET_KEY (or optional STRIPE_MODE override). */
export function getStripeMode(): 'live' | 'test' {
  const key = Deno.env.get('STRIPE_SECRET_KEY') || '';
  const override = (Deno.env.get('STRIPE_MODE') || '').toLowerCase();
  if (override === 'live' || override === 'test') {
    if (override === 'live' && key.startsWith('sk_test_')) {
      throw new Error('STRIPE_MODE=live but STRIPE_SECRET_KEY is a test key (sk_test_).');
    }
    if (override === 'test' && key.startsWith('sk_live_')) {
      throw new Error('STRIPE_MODE=test but STRIPE_SECRET_KEY is a live key (sk_live_).');
    }
    return override;
  }
  if (key.startsWith('sk_live_')) return 'live';
  return 'test';
}

export function assertStripeConfigured() {
  const key = getStripe();
  if (getStripeMode() === 'live' && !Deno.env.get('STRIPE_WEBHOOK_SECRET')?.trim()) {
    throw new Error(
      'Live Stripe requires STRIPE_WEBHOOK_SECRET on Edge Functions (fail-closed).'
    );
  }
  return key;
}

export function getStripe() {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured on Supabase Edge Functions.');
  }
  if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
    throw new Error('STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.');
  }
  return key;
}

export async function stripeRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>
) {
  const key = getStripe();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const init: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    init.body = new URLSearchParams(
      flattenParams(body) as Record<string, string>
    ).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe API error (${res.status})`);
  }
  return data;
}

/** Stripe Connect requests on behalf of a connected account (Express tech). */
export async function stripeConnectRequest(
  path: string,
  method: string,
  body: Record<string, unknown> | undefined,
  connectedAccountId: string
) {
  const key = getStripe();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Stripe-Account': connectedAccountId,
  };
  const init: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(
      flattenParams(body) as Record<string, string>
    ).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe Connect API error (${res.status})`);
  }
  return data;
}

function flattenParams(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenParams(value as Record<string, unknown>, fullKey));
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}
