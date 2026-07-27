/**
 * List Stripe Connect accounts for a tech email and show which one Supabase uses.
 * Usage: node scripts/stripe-connect-duplicates-report.mjs [email]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[t.slice(0, i).trim()] = v;
    }
  } catch {
    /* */
  }
  return out;
}

const env = loadEnv();
const stripeKey = env.STRIPE_SECRET_KEY;
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || 'michaelrsmith2002@protonmail.com').trim().toLowerCase();

if (!stripeKey) {
  console.error('Need STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

async function listStripeAccounts() {
  const matches = [];
  let startingAfter;
  for (let page = 0; page < 25; page++) {
    const qs = new URLSearchParams({ limit: '100' });
    if (startingAfter) qs.set('starting_after', startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/accounts?${qs}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'list accounts failed');
    for (const acct of json.data || []) {
      if (acct.email?.toLowerCase() === email) matches.push(acct);
    }
    if (!json.has_more || !json.data?.length) break;
    startingAfter = json.data[json.data.length - 1].id;
  }
  return matches;
}

async function dbLinkedAccount() {
  if (!url || !serviceKey) return null;
  const pr = await fetch(
    `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const profiles = await pr.json();
  const pid = profiles[0]?.id;
  if (!pid) return null;
  const md = await fetch(`${url}/rest/v1/mechanic_details?profile_id=eq.${pid}&select=stripe_account_id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const rows = await md.json();
  return rows[0]?.stripe_account_id ?? null;
}

const linked = await dbLinkedAccount();
const accounts = await listStripeAccounts();

console.log(`\nEmail: ${email}`);
console.log(`Supabase mechanic_details.stripe_account_id: ${linked ?? '(none)'}`);
console.log(`Stripe Connect accounts with this email: ${accounts.length}\n`);

for (const acct of accounts.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))) {
  const transfers = acct.capabilities?.transfers?.status ?? '?';
  const tag = acct.id === linked ? '  ← APP USES THIS' : '';
  console.log(
    `${acct.id}  transfers=${transfers}  details_submitted=${acct.details_submitted}  profile=${acct.metadata?.adaptivity_profile_id ?? '—'}${tag}`
  );
}

if (accounts.length > 1) {
  console.log('\nTip: In Stripe Dashboard (test mode), delete unused Connect accounts.');
  console.log('Keep the one marked APP USES THIS (or the one with transfers=active), finish onboarding, then Retry transfer in Earnings.\n');
}
