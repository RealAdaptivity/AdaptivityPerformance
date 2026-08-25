#!/usr/bin/env node
/**
 * Probe the PayPal REST API with real credentials and print what it returns.
 *
 * The edge-function client in supabase/functions/_shared/paypal.ts was written
 * against PayPal's published Orders v2 / Payments v2 contract. This script
 * confirms that contract against the actual account before any of it touches
 * customer money — api-m.paypal.com is unreachable from the build environment,
 * so nothing in that client has been exercised.
 *
 * Nothing here charges a card. It mints a token and creates an unapproved order,
 * which reserves nothing until a buyer approves it.
 *
 * Usage (sandbox first, then live):
 *   PAYPAL_CLIENT_ID=xxx PAYPAL_CLIENT_SECRET=yyy PAYPAL_MODE=sandbox \
 *     node scripts/verify-paypal.mjs
 *
 * PowerShell:
 *   $env:PAYPAL_CLIENT_ID="xxx"; $env:PAYPAL_CLIENT_SECRET="yyy"; $env:PAYPAL_MODE="sandbox"
 *   node scripts/verify-paypal.mjs
 */

const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const BASE = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

if (!clientId || !clientSecret) {
  console.error('\n  PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.\n');
  console.error('  Get them at: developer.paypal.com -> Apps & Credentials');
  console.error('  Use the Sandbox pair first, then re-run with the Live pair.\n');
  process.exit(1);
}

console.log(`\nPayPal API verification (${mode})\n${'='.repeat(60)}\n`);

const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}`);
  if (detail) console.log(`        ${detail}`);
};

// 1. OAuth -------------------------------------------------------------
console.log('1. Authentication');
let token = null;
{
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* reported raw below */ }

  if (res.ok && json?.access_token) {
    token = json.access_token;
    record('credentials accepted', true, `token expires in ${json.expires_in}s`);
  } else {
    const proxyBlocked = json === null;
    record(
      'credentials accepted',
      false,
      proxyBlocked
        ? `Non-JSON ${res.status} — the network blocked ${BASE} before the request reached PayPal. Re-run off VPN/proxy.`
        : `${res.status}: ${json?.error_description || text.slice(0, 200)}`
    );
    console.log('\n  Stopping: nothing else can be tested without a token.\n');
    process.exit(1);
  }
}

const call = async (path, method, body, idem) => {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const init = { method, headers };
  if (body) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  if (idem) headers['PayPal-Request-Id'] = idem.slice(0, 38);
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : {}; } catch { /* raw */ }
  return { ok: res.ok, status: res.status, json, text };
};

// 2. AUTHORIZE order — the $85 booking hold ----------------------------
console.log('\n2. AUTHORIZE order (the $85 booking hold)');
{
  const r = await call('/v2/checkout/orders', 'POST', {
    intent: 'AUTHORIZE',
    purchase_units: [{ amount: { currency_code: 'USD', value: '85.00' }, invoice_id: `VERIFY-${Date.now()}` }],
  }, `verify-auth-${Date.now()}`);

  if (r.ok && r.json?.id) {
    record('AUTHORIZE order created', true, `order ${r.json.id}, status ${r.json.status}`);
  } else {
    record('AUTHORIZE order created', false, `${r.status}: ${r.text.slice(0, 300)}`);
    console.log('\n        This is the endpoint the booking hold depends on.');
    console.log('        If AUTHORIZE is rejected, the account may not have');
    console.log('        authorization enabled — ask PayPal to turn it on.');
  }
}

// 3. CAPTURE order — checkout / payment links --------------------------
console.log('\n3. CAPTURE order (checkout and payment links)');
{
  const r = await call('/v2/checkout/orders', 'POST', {
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value: '1.00' } }],
  }, `verify-cap-${Date.now()}`);
  record('CAPTURE order created', Boolean(r.ok && r.json?.id), r.ok ? undefined : `${r.status}: ${r.text.slice(0, 300)}`);
}

// 4. Card vaulting — required for the repair remainder -----------------
console.log('\n4. Card vaulting (charging a repair above the hold)');
{
  const r = await call('/v2/checkout/orders', 'POST', {
    intent: 'AUTHORIZE',
    purchase_units: [{ amount: { currency_code: 'USD', value: '85.00' } }],
    payment_source: { card: { attributes: { vault: { store_in_vault: 'ON_SUCCESS' } } } },
  }, `verify-vault-${Date.now()}`);
  record(
    'vault-on-success accepted',
    Boolean(r.ok && r.json?.id),
    r.ok
      ? undefined
      : `${r.status}: ${r.text.slice(0, 300)}\n        Without vaulting, a repair above the $85 hold cannot be charged\n        without re-collecting the customer's card.`
  );
}

console.log(`\n${'='.repeat(60)}`);
const failed = results.filter((r) => !r.passed);
if (failed.length === 0) {
  console.log('\nAll checks passed. _shared/paypal.ts matches this account.\n');
  console.log('Next: set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_MODE');
  console.log('on Supabase -> Project Settings -> Edge Functions -> Secrets.\n');
} else {
  console.log(`\n${failed.length} check(s) failed:\n`);
  failed.forEach((f) => console.log(`  - ${f.name}`));
  console.log('\nPaste this output back and the client will be corrected to match.\n');
  process.exit(1);
}
