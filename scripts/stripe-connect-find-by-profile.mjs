/** Find Connect accounts by profile metadata when email no longer matches. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* */
}

const stripeKey = env.STRIPE_SECRET_KEY;
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || 'michaelrsmith2002@protonmail.com').trim().toLowerCase();

if (!stripeKey) {
  console.error('Need STRIPE_SECRET_KEY');
  process.exit(1);
}

async function listAllExpress(limitPages = 25) {
  const all = [];
  let startingAfter;
  for (let page = 0; page < limitPages; page++) {
    const qs = new URLSearchParams({ limit: '100' });
    if (startingAfter) qs.set('starting_after', startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/accounts?${qs}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message);
    all.push(...(json.data || []));
    if (!json.has_more || !json.data?.length) break;
    startingAfter = json.data[json.data.length - 1].id;
  }
  return all;
}

let profileId = process.argv[3];
if (!profileId && url && serviceKey) {
  const pr = await fetch(
    `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,role`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const profiles = await pr.json();
  profileId = profiles[0]?.id;
}

let linked = null;
if (url && serviceKey && profileId) {
  const md = await fetch(
    `${url}/rest/v1/mechanic_details?profile_id=eq.${profileId}&select=stripe_account_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = await md.json();
  linked = rows[0]?.stripe_account_id ?? null;
}

const accounts = await listAllExpress();
const byEmail = accounts.filter((a) => a.email?.toLowerCase() === email);
const byProfile = profileId
  ? accounts.filter((a) => a.metadata?.adaptivity_profile_id === profileId)
  : [];

console.log(`\nProfile id: ${profileId ?? '(unknown)'}`);
console.log(`Supabase stripe_account_id: ${linked ?? '(none)'}`);
console.log(`Accounts with email ${email}: ${byEmail.length}`);
console.log(`Accounts with metadata adaptivity_profile_id: ${byProfile.length}`);
console.log(`Total Connect accounts in platform (listed): ${accounts.length}\n`);

const show = (label, list) => {
  if (list.length === 0) return;
  console.log(`--- ${label} ---`);
  for (const acct of list) {
    const tag = acct.id === linked ? '  ← APP DB' : '';
    console.log(
      `${acct.id}  email=${acct.email ?? '—'}  details_submitted=${acct.details_submitted}  payouts=${acct.payouts_enabled}${tag}`
    );
  }
  console.log('');
};

show('By email', byEmail);
show('By profile metadata', byProfile);

if (byEmail.length === 0 && byProfile.length === 0 && accounts.length > 0) {
  console.log('Recent accounts (no email/profile match — last 8):');
  for (const acct of accounts.slice(-8)) {
    console.log(
      `${acct.id}  email=${acct.email ?? '—'}  profile=${acct.metadata?.adaptivity_profile_id ?? '—'}`
    );
  }
}
