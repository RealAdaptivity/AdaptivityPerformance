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

requireText(app, 'usePortalRoute() || isNativeShell()', 'Native portal authentication');

// Supabase orders migrations by the numeric timestamp prefix. A name that is not
// exactly 14 digits sorts unpredictably or is skipped outright, so the migration
// silently never runs. Catch it here rather than in production.
{
  const { readdirSync } = await import('node:fs');
  const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
  const bad = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => !/^\d{14}_/.test(f));
  if (bad.length) {
    throw new Error(
      `Migration filenames must start with a 14-digit timestamp then "_": ${bad.join(', ')}`
    );
  }
}

// The contractor agreement version lives in two places: the TS constant the app
// signs against, and the app_config row the claim gate compares. If they drift,
// either every tech is locked out or a stale signature passes. Fail the build.
{
  const agreementSrc = read('src/services/contractorAgreement.ts');
  const m = agreementSrc.match(/CONTRACTOR_AGREEMENT_VERSION = '([^']+)'/);
  if (!m) throw new Error('Contractor agreement: CONTRACTOR_AGREEMENT_VERSION not found');
  const version = m[1];
  const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
  const { readdirSync } = await import('node:fs');
  const seeded = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .some((f) =>
      readFileSync(new URL(f, migrationsDir), 'utf8').includes(
        `'contractor_agreement_version', '${version}'`
      )
    );
  if (!seeded) {
    throw new Error(
      `Contractor agreement: version ${version} is not seeded into app_config by any migration — ` +
        'add a migration setting contractor_agreement_version, or the claim gate will reject every tech'
    );
  }
}

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
requireText(terms, '${DIAGNOSTIC_HOLD_DOLLARS} diagnostic hold', 'Cancellation terms');
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
// The diagnostic hold is money. serviceCatalog.ts is the source of truth, but the
// edge functions cannot import from src/, so sync-service-catalog.mjs copies it
// into a holdPricing.ts beside each function. Those copies are generated files
// that are committed, so they can be stale in a way nothing else notices: the
// nested capture-booking-payment copy really did still say 85 after the source
// moved to 100, and that is the copy the function capturing cards imports.
{
  const { readdirSync } = await import('node:fs');
  const holdOf = (path, src) => {
    const m = src.match(/export const DIAGNOSTIC_HOLD_DOLLARS\s*=\s*(\d+)\s*;/);
    if (!m) throw new Error(`Diagnostic hold: DIAGNOSTIC_HOLD_DOLLARS not declared in ${path}`);
    return Number(m[1]);
  };

  const sourcePath = 'src/services/serviceCatalog.ts';
  const hold = holdOf(sourcePath, read(sourcePath));

  const fnDir = new URL('../supabase/functions/', import.meta.url);
  const copies = ['supabase/functions/_shared/holdPricing.ts'];
  for (const entry of readdirSync(fnDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_shared') continue;
    const rel = `supabase/functions/${entry.name}/_shared/holdPricing.ts`;
    if (existsSync(new URL(`../${rel}`, import.meta.url))) copies.push(rel);
  }
  for (const rel of copies) {
    const copied = holdOf(rel, read(rel));
    if (copied !== hold) {
      throw new Error(
        `Diagnostic hold: ${rel} says $${copied} but ${sourcePath} says $${hold} — ` +
          'run `npm run sync:service-catalog` and commit the result'
      );
    }
  }

  // Two shapes the prose scan below cannot see, because neither writes a "$".
  // Both were live: localSeoData priced the diagnostic at 85 (and fed that to
  // schema.org as minPrice/maxPrice, so Google was quoted a number the page
  // contradicted), and a no-show button captured a hardcoded 85 while its label
  // said otherwise.
  const seo = JSON.parse(read('src/site/localSeoData.json'));
  for (const service of seo.services ?? []) {
    if (!/diagnostic hold/i.test(service.priceUnit ?? '')) continue;
    if (service.priceFrom !== hold || service.priceTo !== hold) {
      throw new Error(
        `Diagnostic hold: localSeoData service "${service.slug}" prices the hold at ` +
          `${service.priceFrom}-${service.priceTo} but the hold is ${hold} — schema.org Offer would quote the wrong price`
      );
    }
  }

  // In the two consoles that charge cards, every dollar figure must come from the
  // booking, never from a literal — even one matching today's hold. The five
  // bookings taken at $85 keep that hold forever, so a hardcoded "$100 on file"
  // would misstate both what the customer authorized and what the button captures.
  // A literal zero is the exception: "WAIVED ($0.00)" is a state, not a price.
  const literalMoney = /(?<!\$)\$(\d+(?:\.\d+)?)/g;
  for (const rel of ['src/admin/DispatchConsole.tsx', 'src/portal/tech/TechJobsTab.tsx']) {
    for (const [match, figure] of read(rel).matchAll(literalMoney)) {
      if (Number(figure) === 0) continue;
      throw new Error(
        `Diagnostic hold: ${rel} hardcodes "${match}" — these consoles charge real cards, ` +
          "so render holdDollars (the booking's own hold) instead of a literal"
      );
    }
  }

  // A booking stores the hold its customer authorized; any fallback for a row
  // without one must be the current hold, not a frozen literal.
  const fallback = /holdAmountCents\s*\?\?\s*(\d+)/g;
  for (const rel of ['src/admin/DispatchConsole.tsx', 'src/portal/tech/TechJobsTab.tsx']) {
    for (const [match, cents] of read(rel).matchAll(fallback)) {
      throw new Error(
        `Diagnostic hold: ${rel} falls back to a literal in "${match}" (${cents} cents) — ` +
          'use DIAGNOSTIC_HOLD_DOLLARS * 100 so it tracks the hold'
      );
    }
  }

  // Prose drifts too, and this one is customer-facing: the terms page promised a
  // $10 forfeit for eighteen commits while the hold was $85. Both orders occur in
  // this copy ("$100 diagnostic", "diagnostic fee of $100"), so check both.
  const root = new URL('../', import.meta.url).pathname;
  const walk = (dir) => {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) out.push(...walk(next));
      else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(next);
    }
    return out;
  };
  const patterns = [
    /\$(\d+)(?=[\s—-]*(?:diagnostic|hold))/gi,
    /(?:diagnostic|hold)[a-z]*(?:[\s—-]+(?:fee|hold|visit|card|of|is|at|costs?))*[\s—-]+\$(\d+)/gi,
  ];
  const scanned = [...walk(new URL('src/', new URL(root, 'file:'))), ...walk(fnDir)];
  if (scanned.length < 50) {
    throw new Error(`Diagnostic hold: prose scan walked only ${scanned.length} files — the walk is broken`);
  }
  for (const file of scanned) {
    const rel = file.pathname.slice(root.length);
    if (rel.endsWith('holdPricing.ts')) continue; // generated; checked exactly above
    const src = read(rel);
    for (const pattern of patterns) {
      for (const [match, figure] of src.matchAll(pattern)) {
        if (Number(figure) !== hold) {
          throw new Error(
            `Diagnostic hold: ${rel} quotes "${match.trim()}" but the hold is $${hold} — ` +
              'interpolate DIAGNOSTIC_HOLD_DOLLARS instead of writing the figure'
          );
        }
      }
    }
  }
}

console.log('Production operations verification passed.');
