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
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, i).trim()] = v;
  }
} catch {
  /* */
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
const stripe = env.STRIPE_SECRET_KEY;
const email = process.argv[2] || 'michaelrsmith2002@protonmail.com';

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE in .env');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const profiles = await get(`profiles?email=eq.${encodeURIComponent(email)}&select=id,email,role`);
console.log('profile:', profiles);
const pid = profiles[0]?.id;
if (!pid) process.exit(0);

const mechanic = await get(`mechanic_details?profile_id=eq.${pid}&select=*`);
console.log('mechanic_details:', mechanic);

const payments = await get(
  'payments?order=created_at.desc&limit=8&select=booking_reference,status,payout_status,payout_error,tech_transfer_cents,tech_stripe_account_id,amount_cents,created_at'
);
console.log('recent payments:', payments);

const bookings = await get(
  `bookings?mechanic_id=eq.${pid}&order=updated_at.desc&limit=5&select=reference_code,payment_status,status,captured_amount_cents,mechanic_id,payment_intent_id`
);
console.log('bookings for tech:', bookings);

const acct = mechanic[0]?.stripe_account_id;
if (stripe && acct?.startsWith('acct_')) {
  const balRes = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${stripe}`, 'Stripe-Account': acct },
  });
  console.log('connect balance:', await balRes.json());

  const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${acct}`, {
    headers: { Authorization: `Bearer ${stripe}` },
  });
  const acctData = await acctRes.json();
  console.log('connect account capabilities:', {
    id: acctData.id,
    charges_enabled: acctData.charges_enabled,
    payouts_enabled: acctData.payouts_enabled,
    transfers: acctData.capabilities?.transfers,
    card_payments: acctData.capabilities?.card_payments,
  });

  const trRes = await fetch(`https://api.stripe.com/v1/transfers?limit=10&destination=${acct}`, {
    headers: { Authorization: `Bearer ${stripe}` },
  });
  console.log('transfers:', await trRes.json());
} else {
  console.log('No stripe key or acct for balance check');
}
