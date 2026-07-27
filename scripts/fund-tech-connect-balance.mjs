/**
 * Test helper: add platform balance (test charge) and transfer to a tech Connect account.
 * Usage: node scripts/fund-tech-connect-balance.mjs [email] [amountDollars]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const out = {};
  try {
    const text = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* no .env */
  }
  return out;
}

function flattenParams(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenParams(value, fullKey));
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}

async function stripeRequest(key, path, method, body, connectedAccountId) {
  const headers = { Authorization: `Bearer ${key}` };
  if (connectedAccountId) headers['Stripe-Account'] = connectedAccountId;
  const init = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(flattenParams(body)).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

async function findConnectAccountByEmail(stripeKey, email) {
  const target = email.trim().toLowerCase();
  let startingAfter;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ limit: '100' });
    if (startingAfter) qs.set('starting_after', startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/accounts?${qs}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'List accounts failed');
    for (const acct of data.data || []) {
      if (acct.email?.toLowerCase() === target) return acct;
    }
    if (!data.has_more || !data.data?.length) break;
    startingAfter = data.data[data.data.length - 1].id;
  }
  return null;
}

async function transferToConnect(stripeKey, accountId, transferCents, email) {
  try {
    return await stripeRequest(stripeKey, '/transfers', 'POST', {
      amount: transferCents,
      currency: 'usd',
      destination: accountId,
      description: 'Adaptivity test tech balance for instant cash out',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const capabilityIssue =
      msg.includes('capabilities') || msg.includes('capability') || msg.includes('permissions');
    if (!capabilityIssue) throw e;

    console.log('Platform transfer blocked — trying destination charge (test card)…');
    const pi = await stripeRequest(stripeKey, '/payment_intents', 'POST', {
      amount: transferCents,
      currency: 'usd',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      transfer_data: { destination: accountId },
      application_fee_amount: 0,
      description: 'Adaptivity test funding via destination charge',
      metadata: { adaptivity_test_fund: 'true', tech_email: email.trim() },
    });
    if (pi.status !== 'succeeded') {
      throw new Error(
        `Destination charge status: ${pi.status}. Finish Stripe Express onboarding in Settings, then re-run this script.`
      );
    }
    return { id: pi.id, object: 'destination_charge', amount: transferCents };
  }
}

async function main() {
  const env = loadEnv();
  const stripeKey = env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey?.startsWith('sk_')) {
    console.error('Missing STRIPE_SECRET_KEY in adaptivity-performance/.env');
    process.exit(1);
  }

  const email = process.argv[2] || 'Michaelrsmith2002@protonmail.com';
  const dollars = Number(process.argv[3] || '75');
  const transferCents = Math.round(dollars * 100);
  if (!Number.isFinite(transferCents) || transferCents < 100) {
    console.error('Amount must be at least $1');
    process.exit(1);
  }

  const account = await findConnectAccountByEmail(stripeKey, email);
  if (!account?.id) {
    console.error(`No Stripe Connect account found with email ${email}. Finish Express onboarding first.`);
    process.exit(1);
  }

  const acctFull = await stripeRequest(stripeKey, `/accounts/${account.id}`, 'GET');
  const caps = acctFull.capabilities || {};
  const transferReady =
    caps.transfers === 'active' ||
    caps.legacy_payments === 'active' ||
    caps.card_payments === 'active';
  if (!transferReady) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          connectAccountId: account.id,
          email,
          message:
            'Stripe Express onboarding is not finished (transfers/card_payments not active). In the portal: Tech login → Settings → Connect Stripe Express → complete all steps (test bank/debit). Then re-run this script.',
          capabilities: caps,
          detailsSubmitted: acctFull.details_submitted,
          payoutsEnabled: acctFull.payouts_enabled,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const platformChargeCents = Math.max(transferCents + 500, 10000);
  console.log(`Platform test charge $${(platformChargeCents / 100).toFixed(2)}…`);
  const charge = await stripeRequest(stripeKey, '/charges', 'POST', {
    amount: platformChargeCents,
    currency: 'usd',
    source: 'tok_visa',
    description: 'Adaptivity test funding for Connect transfer',
  });
  if (charge.status !== 'succeeded' && charge.paid !== true) {
    throw new Error(`Platform charge status: ${charge.status}`);
  }

  console.log(`Transfer $${(transferCents / 100).toFixed(2)} → ${account.id} (${email})…`);
  const transfer = await transferToConnect(stripeKey, account.id, transferCents, email);

  const balance = await stripeRequest(stripeKey, '/balance', 'GET', undefined, account.id);
  const usdAvailable = (balance.available || []).find((e) => e.currency === 'usd');
  const usdInstant = (balance.instant_available || []).find((e) => e.currency === 'usd');

  console.log(JSON.stringify({
    ok: true,
    email,
    connectAccountId: account.id,
    transferId: transfer.id,
    transferCents,
    connectBalanceAvailableCents: usdAvailable?.amount ?? 0,
    connectBalanceInstantCents: usdInstant?.amount ?? 0,
  }, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
