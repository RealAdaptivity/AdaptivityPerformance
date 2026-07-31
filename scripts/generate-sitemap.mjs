/**
 * Generate public/sitemap.xml for Google Search Console.
 * Run: node scripts/generate-sitemap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://adaptivityperformance.com';
const lastmod = new Date().toISOString().slice(0, 10);

/** Marketing pages (keep in sync with src/site/siteRoute.ts + seo.ts). */
const PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/services', changefreq: 'weekly', priority: '0.9' },
  { path: '/quotes', changefreq: 'weekly', priority: '0.8' },
  { path: '/coverage', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/join', changefreq: 'monthly', priority: '0.6' },
  { path: '/partners', changefreq: 'monthly', priority: '0.6' },
  { path: '/careers', changefreq: 'monthly', priority: '0.5' },
  { path: '/membership', changefreq: 'monthly', priority: '0.5' },
  { path: '/diagnostics', changefreq: 'monthly', priority: '0.5' },
  { path: '/performance', changefreq: 'monthly', priority: '0.5' },
  { path: '/want-to-teach', changefreq: 'monthly', priority: '0.5' },
  { path: '/learn', changefreq: 'monthly', priority: '0.5' },
];

const CITY_SLUGS = [
  'justin',
  'northlake',
  'fort-worth',
  'arlington',
  'frisco',
  'denton',
  'roanoke',
  'argyle',
  'haslet',
  'keller',
  'flower-mound',
  'southlake',
];

const BLOG_SLUGS = [
  'how-much-do-brakes-cost-northlake-tx',
  'mobile-mechanic-vs-dealership-justin-tx',
  'google-business-review-playbook',
];

function urlEntry(loc, changefreq, priority) {
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

const urls = [
  ...PAGES.map((p) => urlEntry(`${ORIGIN}${p.path === '/' ? '/' : p.path}`, p.changefreq, p.priority)),
  ...CITY_SLUGS.map((slug) =>
    urlEntry(`${ORIGIN}/mobile-mechanic-${slug}-tx`, 'weekly', slug === 'justin' || slug === 'northlake' ? '0.85' : '0.8')
  ),
  ...BLOG_SLUGS.map((slug) => urlEntry(`${ORIGIN}/blog/${slug}`, 'monthly', '0.65')),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

const out = path.join(root, 'public', 'sitemap.xml');
fs.writeFileSync(out, xml, 'utf8');
console.log(`Wrote ${urls.length} URLs → ${out}`);
