import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const key = env.STRIPE_SECRET_KEY;
const headers = { Authorization: `Bearer ${key}` };

const balance = await (await fetch('https://api.stripe.com/v1/balance', { headers })).json();
const payouts = await (
  await fetch('https://api.stripe.com/v1/payouts?limit=5', { headers })
).json();
const transfers = await (
  await fetch('https://api.stripe.com/v1/transfers?limit=10', { headers })
).json();

console.log(
  JSON.stringify(
    {
      platform_available: balance.available,
      platform_pending: balance.pending,
      platform_instant_available: balance.instant_available,
      recent_payouts: (payouts.data || []).map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        arrival_date: p.arrival_date
          ? new Date(p.arrival_date * 1000).toISOString().slice(0, 10)
          : null,
        method: p.method,
        status: p.status,
        automatic: p.automatic,
      })),
      recent_transfers_to_techs: (transfers.data || []).map((t) => ({
        id: t.id,
        amount: t.amount / 100,
        destination: t.destination,
        created: new Date(t.created * 1000).toISOString().slice(0, 10),
      })),
    },
    null,
    2
  )
);
