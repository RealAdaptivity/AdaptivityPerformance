/**
 * Emit a real HTML file for every public route.
 *
 * GitHub Pages serves `404.html` with an HTTP 404 status for any path that is
 * not a real file. The SPA still renders, so a human sees the right page — but
 * a crawler sees "not found" and drops the URL. Every city and service page in
 * sitemap.xml was unindexable for exactly this reason.
 *
 * Each emitted file also carries its own title, description, canonical, social
 * tags and JSON-LD, baked in at build time. Metadata comes from the same TS
 * helpers the client uses, so the static HTML and the hydrated page cannot
 * disagree. Crawlers that do not execute JS (most social and AI crawlers) get
 * correct metadata instead of the generic homepage tags.
 *
 * Run: node scripts/emit-static-routes.mjs   (after vite build)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJiti } from 'jiti';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run vite build first');
  process.exit(1);
}

const jiti = createJiti(import.meta.url);
const seo = await jiti.import(path.join(root, 'src/site/seo.ts'));
const local = await jiti.import(path.join(root, 'src/site/localSeo.ts'));
const ld = await jiti.import(path.join(root, 'src/site/structuredData.ts'));
const ads = await jiti.import(path.join(root, 'src/site/adLandings.ts'));
const routes = await jiti.import(path.join(root, 'src/site/siteRoute.ts'));

const { PAGE_SEO, SITE_ORIGIN, SITE_FAQS, citySeo } = seo;
const { LOCAL_CITIES, SERVICE_PAGE_CITIES, LOCAL_SERVICES, serviceCityMeta, serviceCityFaqs } = local;
const { cityJsonLd, serviceCityJsonLd, buildLocalBusinessLd, BUSINESS_ID } = ld;
const { AD_LANDINGS, adLandingMeta, adLandingPath } = ads;
const { LEGACY_PATH_REDIRECTS } = routes;

const template = fs.readFileSync(indexPath, 'utf8');

const escapeAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace a tag's attribute value in place, or report that the tag is missing. */
function setAttr(html, selectorRe, attr, value) {
  const match = html.match(selectorRe);
  if (!match) return { html, missing: true };
  const tag = match[0];
  const next = tag.includes(`${attr}=`)
    ? tag.replace(new RegExp(`${attr}="[^"]*"`), `${attr}="${escapeAttr(value)}"`)
    : tag.replace(/\/?>$/, ` ${attr}="${escapeAttr(value)}">`);
  return { html: html.replace(tag, next), missing: false };
}

const problems = [];

function renderRoute({ meta, jsonLd = [], noindex = false }) {
  let html = template;

  /* Every indexable page states who the business is. City pages already carry
     it (with their own serviceArea), so only add it where it is missing —
     two nodes sharing @id is exactly the drift this replaced. A noindex page
     is not an entity signal, so it gets none. */
  if (!noindex && !jsonLd.some((b) => b && b['@id'] === BUSINESS_ID)) {
    jsonLd = [buildLocalBusinessLd(), ...jsonLd];
  }

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(meta.title)}</title>`);

  const url = `${SITE_ORIGIN}${meta.path === '/' ? '' : meta.path}`;
  const image = `${SITE_ORIGIN}/og-image.png`;
  const fields = [
    [/<meta\s+name="title"[^>]*>/, 'content', meta.title],
    [/<meta\s+name="description"[^>]*>/, 'content', meta.description],
    [/<meta\s+property="og:title"[^>]*>/, 'content', meta.title],
    [/<meta\s+property="og:description"[^>]*>/, 'content', meta.description],
    [/<meta\s+property="og:url"[^>]*>/, 'content', url],
    [/<meta\s+property="og:image"[^>]*>/, 'content', image],
    [/<meta\s+property="twitter:title"[^>]*>/, 'content', meta.title],
    [/<meta\s+property="twitter:description"[^>]*>/, 'content', meta.description],
    [/<meta\s+property="twitter:url"[^>]*>/, 'content', url],
    [/<meta\s+property="twitter:image"[^>]*>/, 'content', image],
    [/<meta\s+name="robots"[^>]*>/, 'content', noindex ? 'noindex, nofollow' : 'index, follow'],
  ];
  for (const [re, attr, value] of fields) {
    const res = setAttr(html, re, attr, value);
    html = res.html;
    if (res.missing) problems.push(`${meta.path}: no tag matching ${re}`);
  }

  const canonicalTag = `<link rel="canonical" href="${escapeAttr(url)}" />`;
  html = /<link\s+rel="canonical"[^>]*>/.test(html)
    ? html.replace(/<link\s+rel="canonical"[^>]*>/, canonicalTag)
    : html.replace('</head>', `    ${canonicalTag}\n  </head>`);

  if (jsonLd.length) {
    // `</script>` inside a JSON string would close the tag early.
    const blocks = jsonLd
      .map(
        (b) =>
          `    <script type="application/ld+json" data-adaptivity-ld="true">${JSON.stringify(b).replace(
            /<\//g,
            '<\\/'
          )}</script>`
      )
      .join('\n');
    html = html.replace('</head>', `${blocks}\n  </head>`);
  }

  return html;
}

function write(routePath, html) {
  const dir = routePath === '/' ? dist : path.join(dist, routePath.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

const written = [];

/* Fixed marketing pages. */
for (const meta of Object.values(PAGE_SEO)) {
  write(meta.path, renderRoute({ meta }));
  written.push(meta.path);
}

/* City landing pages. */
for (const city of LOCAL_CITIES) {
  const meta = citySeo(city);
  write(meta.path, renderRoute({ meta, jsonLd: cityJsonLd(city, SITE_FAQS.slice(0, 6)) }));
  written.push(meta.path);
}

/* Service × city pages. */
for (const city of SERVICE_PAGE_CITIES) {
  for (const service of LOCAL_SERVICES) {
    const meta = serviceCityMeta(service, city);
    write(
      meta.path,
      renderRoute({ meta, jsonLd: serviceCityJsonLd(service, city, serviceCityFaqs(service, city)) })
    );
    written.push(meta.path);
  }
}

/* Paid landing pages — real files, but noindex. */
for (const landing of AD_LANDINGS) {
  write(adLandingPath(landing.slug), renderRoute({ meta: adLandingMeta(landing), noindex: true }));
  written.push(adLandingPath(landing.slug));
}

/* Retired paths. GitHub Pages cannot issue a 301, so the next best thing is a
   real file that canonicalises to the survivor and bounces the visitor — an
   old link keeps its value instead of 404ing. */
for (const [from, to] of Object.entries(LEGACY_PATH_REDIRECTS)) {
  const target = `${SITE_ORIGIN}${to}`;
  write(
    from,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Moved to ${escapeAttr(to)}</title>
    <link rel="canonical" href="${escapeAttr(target)}" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=${escapeAttr(to)}" />
  </head>
  <body>
    <p>This page moved to <a href="${escapeAttr(to)}">${escapeAttr(to)}</a>.</p>
  </body>
</html>
`
  );
  written.push(from);
}

/* App shells that must keep working as deep links. They are sign-in surfaces,
   not content: served as-is they inherited index.html's "index, follow" and the
   homepage's title, so Google was invited to index an admin and a login page
   under the brand name. Real files, so the deep link still boots the SPA, but
   noindex and titled for what they are. */
for (const [route, label] of [
  ['portal', 'Customer & Tech Portal'],
  ['admin', 'Admin'],
  ['login', 'Sign in'],
]) {
  write(
    `/${route}`,
    renderRoute({
      meta: {
        title: `${label} | Adaptivity Performance`,
        description: `${label} for Adaptivity Performance. Sign-in required.`,
        path: `/${route}`,
      },
      noindex: true,
    })
  );
  written.push(`/${route}`);
}

/* Last-resort fallback for genuinely unknown paths (referral codes, pay links). */
fs.copyFileSync(indexPath, path.join(dist, '404.html'));

/* Every sitemap URL must now be a real file, or it 404s to a crawler. */
const sitemap = path.join(dist, 'sitemap.xml');
if (fs.existsSync(sitemap)) {
  const xml = fs.readFileSync(sitemap, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_ORIGIN, '') || '/');
  const unserved = locs.filter((loc) => {
    const dir = loc === '/' ? dist : path.join(dist, loc.replace(/^\//, ''));
    return !fs.existsSync(path.join(dir, 'index.html'));
  });
  if (unserved.length) {
    problems.push(
      `${unserved.length} sitemap URLs have no static file and will return HTTP 404 (e.g. ${unserved[0]})`
    );
  }
}

if (problems.length) {
  console.error('✗ static route emit failed');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`Emitted ${written.length} static routes → dist/ (+ 404.html fallback)`);
