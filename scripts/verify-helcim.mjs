#!/usr/bin/env node
/**
 * Probe the Helcim API with a real token and print the response shapes.
 *
 * The edge-function client in supabase/functions/_shared/helcim.ts was written
 * against Helcim's published API v2 contract. This script confirms that contract
 * against the live account before any of it touches customer money — it verifies
 * the token, opens a real HelcimPay.js preauth checkout session, and dumps the
 * field names Helcim actually returns.
 *
 * Nothing here charges a card. Initializing a checkout session only reserves a
 * token; no card is collected until a customer completes the modal.
 *
 * Usage:
 *   HELCIM_API_TOKEN=xxx node scripts/verify-helcim.mjs
 *
 * PowerShell:
 *   $env:HELCIM_API_TOKEN="xxx"; node scripts/verify-helcim.mjs
 */

const API_BASE = 'https://api.helcim.com/v2';
const token = process.env.HELCIM_API_TOKEN?.trim();

if (!token) {
  console.error('\n  HELCIM_API_TOKEN is not set.\n');
  console.error('  Get one at: Helcim dashboard -> All Tools -> Integrations -> API Access');
  console.error('  Then:  HELCIM_API_TOKEN=xxx node scripts/verify-helcim.mjs\n');
  process.exit(1);
}

const idempotencyKey = (seed) =>
  `${seed}${'0'.repeat(25)}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);

async function call(path, method, body, seed) {
  const headers = { 'api-token': token, accept: 'application/json' };
  const init = { method, headers };
  if (body) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (seed) headers['idempotency-key'] = idempotencyKey(seed);

  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body is reported raw below */
  }
  return { ok: res.ok, status: res.status, json, text };
}

const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}`);
  if (detail) console.log(`        ${detail}`);
};

console.log('\nHelcim API verification\n' + '='.repeat(60) + '\n');

// 1. Token + auth header format.
console.log('1. Authentication');
const auth = await call('/connection-test', 'GET');
if (auth.ok) {
  record('api-token accepted', true, JSON.stringify(auth.json));
} else if (auth.status === 403) {
  // A 403 here has two very different causes. Helcim rejects a bad token with a
  // JSON body; a corporate proxy or sandbox blocking the host returns plain text
  // (often "CONNECT tunnel failed"). Only the first means the key is bad.
  const proxyBlocked = auth.json === null;
  record(
    'api-token accepted',
    false,
    proxyBlocked
      ? 'A 403 with a non-JSON body — the network blocked api.helcim.com before the request reached Helcim. The token was never tested. Re-run off VPN/proxy.'
      : 'Helcim returned 403 — token invalid or lacks permissions.'
  );
  console.log(`\n  Raw body: ${auth.text.slice(0, 200) || '(empty)'}\n`);
  process.exit(1);
} else {
  // /connection-test may not exist on every account tier; a non-403 means the
  // token itself was not rejected, so continue.
  record(
    'api-token accepted',
    true,
    `/connection-test returned ${auth.status} (not a 403, so the token is valid)`
  );
}

// 2. HelcimPay.js preauth session — the booking card hold.
console.log('\n2. HelcimPay.js preauth session (the $85 booking hold)');
const initRes = await call(
  '/helcim-pay/initialize',
  'POST',
  {
    paymentType: 'preauth',
    amount: 85.0,
    currency: 'USD',
    invoiceNumber: `VERIFY-${Date.now()}`,
  },
  `verify${Date.now()}`
);

if (initRes.ok && initRes.json?.checkoutToken) {
  record('preauth checkout session opened', true);
  console.log(`        checkoutToken: ${String(initRes.json.checkoutToken).slice(0, 12)}...`);
  console.log(`        secretToken:   ${initRes.json.secretToken ? 'present' : 'MISSING'}`);
  console.log(`        all fields:    ${Object.keys(initRes.json).join(', ')}`);
} else {
  record(
    'preauth checkout session opened',
    false,
    `status ${initRes.status}: ${initRes.text.slice(0, 300)}`
  );
  console.log('\n        This is the endpoint the booking hold depends on.');
  console.log('        If "preauth" is rejected, the account may not have');
  console.log('        preauthorization enabled — ask Helcim support to turn it on.');
}

// 3. Confirm the account supports the payment types the flow needs.
console.log('\n3. Payment types used by the booking flow');
for (const paymentType of ['purchase', 'verify']) {
  const r = await call(
    '/helcim-pay/initialize',
    'POST',
    { paymentType, amount: 1.0, currency: 'USD' },
    `vt${paymentType}${Date.now()}`
  );
  record(
    `paymentType "${paymentType}" accepted`,
    Boolean(r.ok && r.json?.checkoutToken),
    r.ok ? undefined : `status ${r.status}: ${r.text.slice(0, 200)}`
  );
}

console.log('\n' + '='.repeat(60));
const failed = results.filter((r) => !r.passed);
if (failed.length === 0) {
  console.log('\nAll checks passed. The client in _shared/helcim.ts matches this account.\n');
  console.log('Next: set HELCIM_API_TOKEN and HELCIM_MODE on Supabase Edge Functions.\n');
} else {
  console.log(`\n${failed.length} check(s) failed:\n`);
  failed.forEach((f) => console.log(`  - ${f.name}`));
  console.log('\nPaste this output back and the client will be corrected to match.\n');
  process.exit(1);
}
