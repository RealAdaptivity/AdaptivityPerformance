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
requireText(terms, '$10 diagnostic hold', 'Cancellation terms');
if (terms.includes('$50 late dispatch fee')) throw new Error('Conflicting $50 cancellation fee remains');
const dispatch = read('src/services/techDispatch.ts');
const settings = read('src/portal/tech/TechSettingsTab.tsx');
const w9Migration = read('supabase/migrations/20260802214338_harden_w9_and_job_claims.sql');
const stripeConnect = read('supabase/functions/create-stripe-account-link/index.ts');
const taxSync = read('supabase/functions/sync-tech-tax-status/index.ts');
requireText(dispatch, "supabase.rpc('claim_booking_for_current_tech'", 'Atomic job claim');
if (dispatch.includes("supabase.rpc('mark_tech_w9_complete'") || settings.includes('markTechW9Complete')) throw new Error('W-9 self-certification remains');
requireText(w9Migration, 'not coalesce(v_detail.tax_id_provided, false)', 'W-9 claim gate');
requireText(w9Migration, 'and mechanic_id = (select auth.uid())', 'Claim RLS');
requireText(stripeConnect, 'account.individual?.id_number_provided', 'Stripe individual tax verification');
requireText(stripeConnect, 'account.company?.tax_id_provided', 'Stripe company tax verification');
requireText(taxSync, 'verifiedTaxId(account)', 'Daily Stripe tax verification');
console.log('Production operations verification passed.');
