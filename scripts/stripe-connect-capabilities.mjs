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

const key = env.STRIPE_SECRET_KEY;
const ids = process.argv.slice(2);
if (!key || ids.length === 0) {
  console.error('Usage: node stripe-connect-capabilities.mjs acct_... [...]');
  process.exit(1);
}

for (const id of ids) {
  const r = await fetch(`https://api.stripe.com/v1/accounts/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const a = await r.json();
  if (!r.ok) {
    console.log(id, 'ERROR', a.error?.message);
    continue;
  }
  console.log(
    `${id}  transfers=${a.capabilities?.transfers?.status ?? '?'}  card_payments=${a.capabilities?.card_payments?.status ?? '?'}  payouts_enabled=${a.payouts_enabled}  details_submitted=${a.details_submitted}`
  );
}
