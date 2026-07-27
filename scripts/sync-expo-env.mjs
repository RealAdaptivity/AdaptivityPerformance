/**
 * Sync VITE_* Stripe/Supabase keys from adaptivity-performance .env
 * into tech + customer Expo apps as EXPO_PUBLIC_*.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd());
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env in adaptivity-performance');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const pk = (env.match(/^VITE_STRIPE_PUBLISHABLE_KEY=(.+)$/m) || [])[1]?.trim() || '';
const anon = (env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m) || [])[1]?.trim() || '';
const url =
  (env.match(/^VITE_SUPABASE_URL=(.+)$/m) || [])[1]?.trim() ||
  'https://qqyairzymqpkbfxobztx.supabase.co';

if (!pk.startsWith('pk_')) {
  console.error('VITE_STRIPE_PUBLISHABLE_KEY missing or invalid in .env');
  process.exit(1);
}

const apps = [
  path.join(root, '..', 'adaptivity-customer-app'),
  path.join(root, '..', 'adaptivity-tech-app'),
];

for (const dir of apps) {
  if (!fs.existsSync(dir)) {
    console.warn('Skip missing app dir', dir);
    continue;
  }
  const body = [
    '# Synced from adaptivity-performance .env — do not commit',
    `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=${pk}`,
    `EXPO_PUBLIC_SUPABASE_URL=${url}`,
    anon ? `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}` : '',
  ]
    .filter(Boolean)
    .join('\n') + '\n';
  fs.writeFileSync(path.join(dir, '.env'), body);
  console.log('Synced', path.basename(dir), pk.startsWith('pk_live_') ? 'live' : 'test');
}
