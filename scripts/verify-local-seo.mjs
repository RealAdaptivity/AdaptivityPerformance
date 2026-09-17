/**
 * Guards the local SEO surface: every URL the sitemap advertises must parse back
 * to the same service + city through the router's own matcher, and every city
 * must sit inside the dispatch radius.
 *
 * Run: node scripts/verify-local-seo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJiti } from 'jiti';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);

const seo = await jiti.import(path.join(root, 'src/site/localSeo.ts'));
const {
  LOCAL_HUB,
  LOCAL_CITIES,
  LOCAL_SERVICES,
  allServiceCityPaths,
  serviceCityFromPath,
  serviceCityPath,
  cityPathOf,
} = seo;

const failures = [];
const fail = (msg) => failures.push(msg);

/* 1. Every city is inside the advertised radius. */
for (const city of LOCAL_CITIES) {
  if (city.distanceMiles > LOCAL_HUB.radiusMiles) {
    fail(`${city.city} is ${city.distanceMiles} mi out, past the ${LOCAL_HUB.radiusMiles}-mile radius`);
  }
  if (!city.zips.length) fail(`${city.city} has no zips`);
}

/* 2. Slugs are unique and URL-safe. */
const seen = new Set();
for (const { slug } of [...LOCAL_CITIES, ...LOCAL_SERVICES]) {
  if (!/^[a-z0-9-]+$/.test(slug)) fail(`slug "${slug}" is not URL-safe`);
}
for (const c of LOCAL_CITIES) {
  if (seen.has(c.slug)) fail(`duplicate city slug "${c.slug}"`);
  seen.add(c.slug);
}

/* 3. Every service × city URL round-trips through the router's matcher. */
const paths = allServiceCityPaths();
for (const p of paths) {
  const match = serviceCityFromPath(p);
  if (!match) {
    fail(`${p} does not parse back to a service + city`);
    continue;
  }
  const rebuilt = serviceCityPath(match.service.slug, match.city.slug);
  if (rebuilt !== p) fail(`${p} round-tripped to ${rebuilt}`);
}
if (new Set(paths).size !== paths.length) fail('service × city paths collide');

/* 4. City pages must not be swallowed by the service matcher. */
for (const city of LOCAL_CITIES) {
  if (serviceCityFromPath(cityPathOf(city.slug))) {
    fail(`${cityPathOf(city.slug)} is being matched as a service page`);
  }
}

/* 5. Paid landing pages resolve, and never leak into the organic index. */
const ads = await jiti.import(path.join(root, 'src/site/adLandings.ts'));
const { AD_LANDINGS, adLandingFromPath, adLandingPath } = ads;

for (const landing of AD_LANDINGS) {
  const p = adLandingPath(landing.slug);
  if (adLandingFromPath(p)?.slug !== landing.slug) fail(`${p} does not resolve to an ad landing`);
  if (serviceCityFromPath(p)) fail(`${p} is being matched as a service page`);
}

const robots = fs.readFileSync(path.join(root, 'public', 'robots.txt'), 'utf8');
if (!robots.includes('Disallow: /lp/')) fail('robots.txt does not disallow /lp/');

/* 6. The sitemap on disk matches what the catalog produces. */
const sitemapPath = path.join(root, 'public', 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const missing = paths.filter((p) => !xml.includes(`${p}</loc>`));
  if (missing.length) {
    fail(`${missing.length} service pages missing from sitemap.xml (e.g. ${missing[0]}) — run generate-sitemap`);
  }
  if (xml.includes('/lp/')) fail('ad landing pages leaked into sitemap.xml');
}

/* 7. Exactly one business entity, and it agrees with the catalog.
      index.html used to hand-write its own block: it drifted to a 20-mile
      radius and a different `name` while sharing the generated block's @id, so
      a crawler merging by @id saw two answers for the radius and the business
      name. Both are load-bearing for a map listing, so assert there is one
      definition and that it still matches the catalog. */
const sd = await jiti.import(path.join(root, 'src/site/structuredData.ts'));
const { buildLocalBusinessLd, BUSINESS_ID, BUSINESS_NAME } = sd;
const seoMod = await jiti.import(path.join(root, 'src/site/seo.ts'));
const { GOOGLE_BUSINESS_PROFILE_NAME } = seoMod;

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/<script[^>]*application\/ld\+json/.test(indexHtml)) {
  fail('index.html hand-writes JSON-LD again — the business block is generated per route');
}

const biz = buildLocalBusinessLd();
if (biz['@id'] !== BUSINESS_ID) fail('business block @id does not match BUSINESS_ID');

/* The schema name must be the Google listing's name, character for character:
   that match is part of how the site and the listing are read as one business.
   GOOGLE_BUSINESS_PROFILE_NAME is the one place it is declared, so this catches
   a second name being hardcoded anywhere in the chain — the exact drift that
   put two different names under one @id before. */
if (!GOOGLE_BUSINESS_PROFILE_NAME || !String(GOOGLE_BUSINESS_PROFILE_NAME).trim()) {
  fail('GOOGLE_BUSINESS_PROFILE_NAME is empty — it must carry the live listing name');
}
if (BUSINESS_NAME !== GOOGLE_BUSINESS_PROFILE_NAME) {
  fail(`BUSINESS_NAME "${BUSINESS_NAME}" is not GOOGLE_BUSINESS_PROFILE_NAME "${GOOGLE_BUSINESS_PROFILE_NAME}"`);
}
if (biz.name !== GOOGLE_BUSINESS_PROFILE_NAME) {
  fail(`business block name "${biz.name}" does not match the Google listing "${GOOGLE_BUSINESS_PROFILE_NAME}"`);
}

const circle = (biz.areaServed || []).find((a) => a['@type'] === 'GeoCircle');
if (!circle) fail('business block has no GeoCircle areaServed');
else if (circle.geoRadius !== `${LOCAL_HUB.radiusMiles} mi`) {
  fail(`business geoRadius ${circle.geoRadius} != catalog ${LOCAL_HUB.radiusMiles} mi`);
}

const namedCities = (biz.areaServed || []).filter((a) => a['@type'] === 'City').length;
if (namedCities !== LOCAL_CITIES.length) {
  fail(`business areaServed names ${namedCities} cities, catalog has ${LOCAL_CITIES.length}`);
}

for (const url of biz.sameAs || []) {
  if (!/^https:\/\//.test(url)) fail(`sameAs entry is not an https URL: ${url}`);
}

if (failures.length) {
  console.error(`✗ local SEO check failed (${failures.length})`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `✓ local SEO OK — ${LOCAL_CITIES.length} cities, ${LOCAL_SERVICES.length} services, ` +
    `${paths.length} service pages, ${AD_LANDINGS.length} ad landings, ` +
    `all within ${LOCAL_HUB.radiusMiles} mi of ${LOCAL_HUB.city}`
);
