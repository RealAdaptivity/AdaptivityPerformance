/**
 * Sync VITE_SUPABASE_* keys from adaptivity-performance .env into the tech +
 * customer Expo apps as EXPO_PUBLIC_*.
 *
 * This used to sync a Stripe publishable key too, and exited non-zero when one
 * was absent. Payments are taken in person with Square now and the apps carry
 * no processor key, so Supabase is all there is to sync.
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
const anon = (env.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m) || [])[1]?.trim() || '';
const url =
  (env.match(/^VITE_SUPABASE_URL=(.+)$/m) || [])[1]?.trim() ||
  'https://qqyairzymqpkbfxobztx.supabase.co';

if (!anon) {
  console.error('VITE_SUPABASE_ANON_KEY missing in .env');
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
  const body =
    [
      '# Synced from adaptivity-performance .env — do not commit',
      `EXPO_PUBLIC_SUPABASE_URL=${url}`,
      `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
    ].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, '.env'), body);
  console.log('Synced', path.basename(dir));
}
