import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: missing ${text}`);
};

const app = read('src/App.tsx');
const portalRoute = read('src/portal/portalRoute.ts');
const migration = read('supabase/migrations/20260802212916_payment_operations_hardening.sql');
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
requireText(terms, '${DIAGNOSTIC_FEE_DOLLARS} diagnostic', 'Cancellation terms');
if (terms.includes('$50 late dispatch fee')) throw new Error('Conflicting $50 cancellation fee remains');
const dispatch = read('src/services/techDispatch.ts');
const settings = read('src/portal/tech/TechSettingsTab.tsx');
const w9Migration = read('supabase/migrations/20260920012922_booking_email_and_manual_w9.sql');
requireText(dispatch, "supabase.rpc('claim_booking_for_current_tech'", 'Atomic job claim');
if (dispatch.includes("supabase.rpc('mark_tech_w9_complete'") || settings.includes('markTechW9Complete')) throw new Error('W-9 self-certification remains');
requireText(w9Migration, 'not coalesce(v_detail.tax_id_provided, false)', 'W-9 claim gate');
// The diagnostic fee is money. serviceCatalog.ts is the source of truth, but the
// edge functions cannot import from src/, so sync-service-catalog.mjs copies it
// into a servicePricing.ts beside each function. Those copies are generated files
// that are committed, so they can be stale in a way nothing else notices: the
// nested capture-booking-payment copy really did still say 85 after the source
// moved to 100, and that is the copy the function capturing cards imports.
{
  const { readdirSync } = await import('node:fs');
  const holdOf = (path, src) => {
    const m = src.match(/export const DIAGNOSTIC_FEE_DOLLARS\s*=\s*(\d+)\s*;/);
    if (!m) throw new Error(`Diagnostic hold: DIAGNOSTIC_FEE_DOLLARS not declared in ${path}`);
    return Number(m[1]);
  };

  const sourcePath = 'src/services/serviceCatalog.ts';
  const hold = holdOf(sourcePath, read(sourcePath));

  const fnDir = new URL('../supabase/functions/', import.meta.url);
  const copies = ['supabase/functions/_shared/servicePricing.ts'];
  for (const entry of readdirSync(fnDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_shared') continue;
    const rel = `supabase/functions/${entry.name}/_shared/servicePricing.ts`;
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
          "so render quotedDollars (the booking's own hold) instead of a literal"
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
          'use DIAGNOSTIC_FEE_DOLLARS * 100 so it tracks the hold'
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
    if (rel.endsWith('servicePricing.ts')) continue; // generated; checked exactly above
    const src = read(rel);
    for (const pattern of patterns) {
      for (const [match, figure] of src.matchAll(pattern)) {
        if (Number(figure) !== hold) {
          throw new Error(
            `Diagnostic hold: ${rel} quotes "${match.trim()}" but the hold is $${hold} — ` +
              'interpolate DIAGNOSTIC_FEE_DOLLARS instead of writing the figure'
          );
        }
      }
    }
  }
}

// Payment is taken in person on Square. Nothing in the site or the edge
// functions may talk to a card processor again without this failing first.
{
  const { readdirSync } = await import('node:fs');
  const walk = (dir) => {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) out.push(...walk(next));
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(next);
    }
    return out;
  };
  const root = new URL('../', import.meta.url).pathname;
  const banned = /api\.stripe\.com|STRIPE_SECRET_KEY|@stripe\/|stripeRequest\(/;
  const offenders = [];
  for (const dir of ['src/', 'supabase/functions/']) {
    for (const file of walk(new URL(dir, new URL(root, 'file:')))) {
      const rel = file.pathname.slice(root.length);
      if (banned.test(read(rel))) offenders.push(rel);
    }
  }
  if (offenders.length) {
    throw new Error(
      `Card processing is done in person now — these files call a payment processor: ${offenders.join(', ')}`
    );
  }
  const pkg = JSON.parse(read('package.json'));
  const stripeDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => d.startsWith('@stripe/'));
  if (stripeDeps.length) throw new Error(`Stripe packages are back in package.json: ${stripeDeps.join(', ')}`);
}

// Booking reference codes are the only thing standing between an anonymous
// caller and a customer's name, phone and home address, because
// get_booking_by_reference is reachable signed-out. They were 'AP-' plus four
// digits — 9,000 codes, sweepable in seconds, and every booking was retrieved
// that way before this was fixed. The generator must keep both the wide
// alphabet and the collision retry.
{
  const refMigration = read('supabase/migrations/20260920190802_harden_booking_reference_lookup.sql');
  requireText(refMigration, "v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'", 'Booking reference alphabet');
  requireText(refMigration, 'for i in 1..8 loop', 'Booking reference length');
  requireText(refMigration, 'exit when not exists', 'Booking reference collision retry');
  requireText(refMigration, 'phone_last4', 'Booking lookup second factor');
  if (/lpad\(\(floor\(random\(\) \* 9000\)/.test(refMigration)) {
    throw new Error('The 4-digit booking reference generator is back — that keyspace is 9,000 codes and was enumerable');
  }
}

console.log('Production operations verification passed.');
