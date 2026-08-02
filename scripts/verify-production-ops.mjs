import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: missing ${text}`);
};

const app = read('src/App.tsx');
const portalRoute = read('src/portal/portalRoute.ts');
const cleanup = read('supabase/functions/cleanup-expired-holds/index.ts');
const migration = read('supabase/migrations/20260802212916_payment_operations_hardening.sql');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
const webhookSync = read('supabase/functions/configure-stripe-webhook-events/index.ts');
const terms = read('src/pages/TermsPrivacyPage.tsx');

requireText(app, 'usePortalRoute() || Capacitor.isNativePlatform()', 'Native portal authentication');
if (app.includes('StandaloneTechApp') || existsSync(new URL('../src/components/StandaloneTechApp.tsx', import.meta.url))) {
  throw new Error('Demo technician shell is still reachable');
}
requireText(portalRoute, "window.location.search.includes('view=tech')", 'Tech route authentication');
requireText(cleanup, "Deno.env.get('CLEANUP_CRON_SECRET')", 'Cleanup authentication');
requireText(cleanup, 'cancelBookingHoldForRow', 'Expired hold release');
requireText(migration, "'*/15 * * * *'", 'Cleanup schedule');
for (const event of ['payment_intent.canceled', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']) {
  requireText(webhook, event, 'Stripe reconciliation');
  requireText(webhookSync, event, 'Stripe event subscription');
}
requireText(terms, 'temporary $10 diagnostic hold', 'Cancellation terms');
if (terms.includes('$50 late dispatch fee')) throw new Error('Conflicting $50 cancellation fee remains');
console.log('Production operations verification passed.');
