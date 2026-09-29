import { existsSync, readFileSync, readdirSync } from 'node:fs';

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

// The no-processor guard above walks src/ and supabase/functions/ only. That is
// where the shipped code lives, so a pile of Stripe *tooling* sat untouched in
// scripts/ long after the integration was gone: deploy scripts, Connect
// reporting utilities, and a package-edge-functions.mjs that had been throwing
// on import since _shared/stripe.ts was deleted. A stale .env.example still
// told a reader to go get an sk_live_ key. Widen the net to the files that
// configure a deploy, and keep this file and the retired-function notes out of
// it — they are allowed to name what they ban.
{
  const { readdirSync, statSync } = await import('node:fs');
  const root = new URL('../', import.meta.url).pathname;
  const allow = new Set([
    'scripts/verify-production-ops.mjs',
    'supabase/functions/_retired/README.md',
    'supabase/functions/_retired/tombstone.ts',
  ]);
  // Bare "stripe" is a false positive: brand-assets renders an orange stripe on
  // the business card. Match the things only a real integration carries.
  const banned = /api\.stripe\.com|STRIPE_SECRET_KEY|STRIPE_PUBLISHABLE_KEY|STRIPE_WEBHOOK_SECRET|STRIPE_CONNECT|sk_live_|sk_test_|stripe-connect|deploy-stripe/;
  const offenders = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(root + rel);
    } catch {
      return;
    }
    for (const name of entries) {
      const childRel = rel + name;
      if (statSync(root + childRel).isDirectory()) {
        walk(childRel + '/');
        continue;
      }
      if (allow.has(childRel)) continue;
      if (banned.test(read(childRel))) offenders.push(childRel);
    }
  };
  walk('scripts/');
  for (const file of ['.env.example', 'supabase/config.toml', '.github/workflows/deploy.yml']) {
    if (existsSync(new URL(`../${file}`, import.meta.url)) && !allow.has(file)) {
      if (banned.test(read(file))) offenders.push(file);
    }
  }
  if (offenders.length) {
    throw new Error(
      `Payment-processor tooling is back outside src/ — the website takes no cards: ${offenders.join(', ')}`
    );
  }
}

// The edge function decides whether a booking is accepted, and its coverage
// list used to be a 3-digit prefix match on 750/751/752/760/761/762 while the
// site built an explicit allow-list from localSeoData.json. That is ~600 ZIPs
// against the 48 actually served, and 751/752 are Dallas — which the site's own
// serviceArea.ts calls out as twice as far as this business will dispatch. The
// two are generated from one source now; this keeps them that way.
{
  const seo = JSON.parse(read('src/site/localSeoData.json'));
  const expected = new Set();
  for (const city of seo.cities || []) {
    for (const z of city.zips || []) expected.add(String(z));
    if (city.zip) expected.add(String(city.zip));
  }
  if (seo.hub?.zip) expected.add(String(seo.hub.zip));

  const edgeArea = read('supabase/functions/_shared/serviceArea.ts');
  if (/COVERED_ZIP_PREFIXES/.test(edgeArea)) {
    throw new Error(
      'Edge serviceArea is prefix-matching ZIPs again — that accepts all of Dallas. Run: node scripts/sync-service-catalog.mjs'
    );
  }
  const found = new Set([...edgeArea.matchAll(/"(\d{5})"/g)].map((m) => m[1]));
  const missing = [...expected].filter((z) => !found.has(z)).sort();
  const extra = [...found].filter((z) => !expected.has(z)).sort();
  if (missing.length || extra.length) {
    throw new Error(
      `Edge service-area ZIPs have drifted from localSeoData.json (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}). Run: node scripts/sync-service-catalog.mjs`
    );
  }
}

// The no-processor guards above look for processor *code*. They said nothing
// about processor *copy*, so long after the holds were gone the site still told
// customers it placed one: "transparent $100 holds" in the footer of every
// page, "$100 hold" as the heading on every city landing page, "We book, hold
// cards, and dispatch" in an indexed meta description, and "Continue to card on
// file" on the booking form's own submit button. Nothing takes a card any more,
// so none of that is true.
//
// Tokenised rather than matched on quotes: the first version of this check only
// looked inside string literals, which caught 'Cancel hold failed' and sailed
// straight past the footer, where the copy is bare JSX text. A line is prose
// about a hold when it carries a bare `hold`/`holds` token; holdAmountCents,
// hold_expires_at, HoldQuote and canCancelHold are identifiers naming real
// database columns and handlers, and stay.
{
  const { readdirSync, statSync } = await import('node:fs');
  const root = new URL('../', import.meta.url).pathname;
  const allow = new Set([
    'scripts/verify-production-ops.mjs',
    'src/content/contractorAgreementText.ts',
  ]);
  // Holding a licence, holding slots and holding someone harmless are all
  // ordinary English and have nothing to do with cards.
  const ordinaryEnglish =
    /hold harmless|withhold|hold a valid|hold any licen|what you hold|hold same-day|hold the chat|on hold/i;
  const offenders = [];
  const walk = (rel) => {
    for (const name of readdirSync(root + rel)) {
      const childRel = rel + name;
      if (statSync(root + childRel).isDirectory()) { walk(childRel + '/'); continue; }
      if (!/\.tsx?$/.test(name) || allow.has(childRel)) continue;
      for (const [i, line] of read(childRel).split('\n').entries()) {
        if (!/hold/i.test(line) || ordinaryEnglish.test(line)) continue;
        const bareHold = (line.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).some((t) =>
          /^holds?$/i.test(t)
        );
        if (bareHold) offenders.push(`${childRel}:${i + 1}`);
      }
    }
  };
  walk('src/');
  if (offenders.length) {
    throw new Error(
      `Copy still promises a card hold, but nothing takes a card: ${offenders.join(', ')}`
    );
  }
}

// ScrollReveal hides its children at opacity 0 until an IntersectionObserver
// says they are in view. With a non-zero threshold the callback only fires once
// that fraction of the element is inside the root, so a block taller than
// root / threshold can never qualify: at 0.14, on an 844px phone whose root
// rootMargin trims to ~793px, anything over ~5,660px stayed invisible for good.
// /privacy, /terms and /join were blank pages in production because of it.
// Any threshold above 0 reintroduces a height beyond which a page silently
// disappears, so the number is pinned here.
{
  const reveal = read('src/components/ScrollReveal.tsx');
  const m = reveal.match(/threshold:\s*([0-9.]+)/);
  if (!m) throw new Error('ScrollReveal: no IntersectionObserver threshold found');
  if (Number(m[1]) !== 0) {
    throw new Error(
      `ScrollReveal threshold is ${m[1]}; it must be 0, or blocks taller than ~${Math.round(793 / Number(m[1]))}px never become visible`
    );
  }
}

// The SMS opt-in wording is reviewed by a carrier before the 10DLC campaign is
// approved, and the number in it must be the one texts actually come from.
// smsConsent.ts owns that number rather than importing it, so nothing would
// otherwise notice if the advertised phone changed and the consent text kept
// quoting the old one — a mismatch a reviewer treats as a failed registration.
{
  const consent = read('src/content/smsConsent.ts');
  const seo = read('src/site/seo.ts');
  const inConsent = consent.match(/SMS_FROM_NUMBER = '([^']+)'/)?.[1];
  const inSeo = seo.match(/SITE_PHONE_DISPLAY = '([^']+)'/)?.[1];
  if (!inConsent) throw new Error('smsConsent: SMS_FROM_NUMBER not found');
  if (!inSeo) throw new Error('seo: SITE_PHONE_DISPLAY not found');
  if (inConsent !== inSeo) {
    throw new Error(
      `SMS consent says texts come from ${inConsent} but the site advertises ${inSeo}. ` +
        'Make them agree, or if the campaign really does send from a different number, update this check deliberately.'
    );
  }

  // A pre-selected opt-in is not consent, and carriers reject it outright.
  const contact = read('src/components/ContactSection.tsx');
  if (!/useState<'yes' \| 'no' \| null>\(null\)/.test(contact)) {
    throw new Error('Contact form SMS consent must start unselected (null), or the opt-in is pre-ticked');
  }
}

// The registered entity is RealAdaptivity LLC, trading as AdaptivityPerformance.
// "Adaptivity Performance LLC" names a company that does not exist, and it had
// been printed in the footer copyright and on the refund policy beside the
// sentence "Registered in the State of Texas" — a claim about a legal person
// who is not registered, on the same site as a privacy policy naming the real
// one. Public copy must read the shared constant so the two cannot disagree.
//
// The contractor agreement is deliberately exempt. Three technicians have
// already signed text naming that entity, and the signing flow gates on a
// version: editing the words either silently detaches those signatures from
// what was agreed, or forces everyone to re-sign. That is a decision for the
// owner and a lawyer, not for a find-and-replace.
{
  const DEAD_ENTITY = 'Adaptivity Performance LLC';
  const signedDocuments = new Set([
    'src/services/contractorAgreementPdf.ts',
    'src/content/contractorAgreementText.ts',
    'src/content/contractorLiability.ts',
    'src/portal/tech/ContractorAgreementSignModal.tsx',
  ]);

  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|html|json|md)$/.test(entry.name) && !signedDocuments.has(rel)) {
        if (read(rel).includes(DEAD_ENTITY)) offenders.push(rel);
      }
    }
  };
  walk('src');

  if (offenders.length) {
    throw new Error(
      `${offenders.join(', ')} name "${DEAD_ENTITY}", which is not a real company. ` +
        'Import LEGAL_ENTITY_NAME from src/content/businessIdentity.ts instead.'
    );
  }

  // And the constant itself must still be the entity the owner confirmed.
  const identity = read('src/content/businessIdentity.ts');
  if (!/LEGAL_ENTITY_NAME = 'RealAdaptivity LLC DBA AdaptivityPerformance'/.test(identity)) {
    throw new Error('businessIdentity: LEGAL_ENTITY_NAME is no longer the registered entity');
  }
}

// A carrier reviewing the 10DLC campaign may open the privacy policy or the
// terms of service. The disclosures were on the privacy policy only, and the
// review came back saying they were missing — so both pages must carry all
// five, and both must read them from smsConsent.ts rather than restating them,
// because two pages quoting the program differently is the mismatch a reviewer
// is looking for.
{
  const required = [
    'SMS_MESSAGE_TYPES_NOTICE',
    'SMS_FREQUENCY_NOTICE',
    'SMS_RATES_NOTICE',
    'SMS_OPT_OUT_INSTRUCTION',
    'SMS_HELP_INSTRUCTION',
  ];
  const consent = read('src/content/smsConsent.ts');
  for (const name of required) {
    if (!new RegExp(`export const ${name}\\b`).test(consent)) {
      throw new Error(`smsConsent.ts no longer exports ${name}; the SMS disclosures have no single source`);
    }
  }

  // The opt-out and help instructions must name the number a customer texts.
  for (const name of ['SMS_OPT_OUT_INSTRUCTION', 'SMS_HELP_INSTRUCTION']) {
    const body = consent.match(new RegExp(`export const ${name} =([^;]+);`))?.[1] ?? '';
    if (!body.includes('SMS_FROM_NUMBER')) {
      throw new Error(`${name} must name SMS_FROM_NUMBER: "reply STOP" without a number is not an instruction`);
    }
  }

  for (const page of ['src/pages/PrivacyPolicyPage.tsx', 'src/pages/TermsPrivacyPage.tsx']) {
    // Strip import statements first. Deleting the whole section leaves the
    // imports behind, so a plain includes() check passes on exactly the
    // breakage this guard exists to catch — it did, until this line.
    const src = read(page).replace(/^import\s[\s\S]*?from\s+'[^']+';$/gm, '');
    const missing = required.filter((name) => !src.includes(name));
    // The privacy policy predates these constants and spells the same clauses
    // out inline, so it is held to the plain-text requirement instead.
    if (page.endsWith('PrivacyPolicyPage.tsx')) {
      const clauses = [
        [/message frequency varies/i, 'message frequency varies'],
        [/message and data rates may apply/i, 'message and data rates may apply'],
        [/\bSTOP\b/, 'STOP to opt out'],
        [/\bHELP\b/, 'HELP for assistance'],
      ];
      for (const [re, what] of clauses) {
        if (!re.test(src)) throw new Error(`${page} is missing the SMS disclosure: ${what}`);
      }
      continue;
    }
    if (missing.length) {
      throw new Error(
        `${page} does not render ${missing.join(', ')}. ` +
          'The SMS disclosures must appear on the terms of service, not only the privacy policy.'
      );
    }
  }
}

// The edge function quotes the radius back at a customer it refuses. That
// sentence said 25 miles while the catalog said 30, so a refused customer was
// told a number the rest of the site contradicted. It is generated from the
// catalog now, and this fails the build if the two ever disagree again.
{
  const catalog = JSON.parse(read('src/site/localSeoData.json'));
  const radius = catalog.hub?.radiusMiles;
  if (!radius) throw new Error('localSeoData hub has no radiusMiles');
  const area = read('supabase/functions/_shared/serviceArea.ts');
  const m = area.match(/within (\d+) miles of our hub/);
  if (!m) throw new Error('edge serviceArea no longer states the radius when refusing a booking');
  if (Number(m[1]) !== radius) {
    throw new Error(
      `edge refusal message says ${m[1]} miles but the catalog radius is ${radius} — re-run sync-service-catalog.mjs`
    );
  }
}

// The browser composes the vehicle description and the edge function
// recomposes it, so a caller cannot put one vehicle in the structured fields
// and a different one in the string the technician actually reads. Two
// implementations of one rule drift, so the pieces that must match are pinned.
{
  const client = read('src/services/vehicleDetails.ts');
  const edge = read('supabase/functions/create-booking-request/index.ts');

  // Same field order, head first, engine last.
  const clientOrder = client.match(/\[v\.year, v\.make, v\.model, v\.trim\]/);
  if (!clientOrder) throw new Error('vehicleDetails: composeVehicleDescription no longer joins year, make, model, trim in that order');
  const edgeOrder = /str\(vehicleYear[\s\S]{0,120}str\(vehicleMake[\s\S]{0,120}str\(vehicleModel[\s\S]{0,120}str\(vehicleTrim/.test(edge);
  if (!edgeOrder) throw new Error('create-booking-request: vehicle parts are no longer composed in year, make, model, trim order');

  // Same separator before the engine. The client writes it literally, the
  // edge function as an escape, so both spellings are accepted.
  if (!/ (\u00b7|·) \$\{engine\}`/.test(client)) {
    throw new Error('vehicleDetails: engine separator changed; the edge function still writes " \u00b7 "');
  }
  if (!/\\u00b7|·/.test(edge)) {
    throw new Error('create-booking-request: engine separator changed; the client still writes " · "');
  }

  // Media is optional, and the column is an array with a default, so the edge
  // function must never reject a booking for having no attachments.
  if (!/Array\.isArray\(mediaPaths\)/.test(edge)) {
    throw new Error('create-booking-request: mediaPaths is no longer treated as an optional array');
  }
  if (!/\.\.'\)|includes\('\.\.'\)/.test(edge)) {
    throw new Error('create-booking-request: media paths are no longer checked for directory traversal');
  }
}

// Cancelling a job from the dispatch board wrote the wrong status, and the
// release control could never appear. Both were leftovers from the era when a
// card was authorized at booking, and both failed invisibly: the admin picked Cancel, the board
// reloaded, and the job came back as UNASSIGNED with no error shown.
{
  const console_ = read('src/admin/DispatchConsole.tsx');

  // 1. CANCELED must not be rerouted through adminCancelBookingHold, which
  //    writes 'UNASSIGNED' when releaseJob is true.
  if (/status === 'CANCELED'[\s\S]{0,200}adminCancelBookingHold\(/.test(console_)) {
    throw new Error(
      "DispatchConsole routes a CANCELED status through adminCancelBookingHold again; " +
        "with releaseJob=true that writes UNASSIGNED, so cancelling silently un-assigns the job"
    );
  }

  // 2. The release control must not be gated on a payment field. Nothing takes
  //    a card, so payment_intent_id is null on every booking and the control
  //    would never render.
  const gate = console_.match(/const canReleaseToPool =([\s\S]{0,240}?);/);
  if (!gate) throw new Error('DispatchConsole: canReleaseToPool gate not found');
  if (/payment/i.test(gate[1])) {
    throw new Error(
      'canReleaseToPool is gated on a payment field again; payment_intent_id is null on ' +
        'every booking since cards were removed, so the control would never render'
    );
  }
}

// The dispatch board draws one column per job status. A status with no column
// is a job on nobody's screen: groupBookingsForBoard hands it back as
// `unplaced` and the console says so, but the board still won't show it. So
// the two lists have to stay in step — add a status, add a column.
{
  const board = read('src/services/dispatchBoard.ts');
  const console_ = read('src/admin/DispatchConsole.tsx');

  const statusOptions = console_.match(/const STATUS_OPTIONS: JobStatus\[\] = \[([^\]]*)\]/);
  if (!statusOptions) throw new Error('DispatchConsole: STATUS_OPTIONS not found');
  const statuses = [...statusOptions[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort();

  const columnStatuses = [...board.matchAll(/status: '([A-Z_]+)'/g)].map((m) => m[1]).sort();

  if (statuses.length === 0 || columnStatuses.length === 0) {
    throw new Error('dispatchBoard: could not read the status lists to compare');
  }

  const missing = statuses.filter((s) => !columnStatuses.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `dispatchBoard has no column for ${missing.join(', ')}; jobs with that status would ` +
        'not appear on the board at all'
    );
  }

  const stray = columnStatuses.filter((s) => !statuses.includes(s));
  if (stray.length > 0) {
    throw new Error(
      `dispatchBoard has a column for ${stray.join(', ')}, which is not a real job status`
    );
  }

  // Work still to be done is never hidden behind a "+N more". Only the columns
  // that sort newest-first (the finished ones) may be capped.
  if (!/const capped = column\.newestFirst \? all\.slice\(0, limit\) : all;/.test(board)) {
    throw new Error(
      'dispatchBoard caps columns some other way now; an UNASSIGNED job hidden behind a ' +
        '"+N more" is a job nobody dispatches'
    );
  }
}

console.log('Production operations verification passed.');
