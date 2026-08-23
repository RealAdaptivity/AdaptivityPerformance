import fs from 'fs';
import path from 'path';

const dist = path.join(process.cwd(), 'dist');
const index = path.join(dist, 'index.html');
const fallback = path.join(dist, '404.html');

if (!fs.existsSync(index)) {
  console.error('dist/index.html not found — run vite build first');
  process.exit(1);
}

fs.copyFileSync(index, fallback);

// GitHub Pages / custom domain: routes must be real directories or they hard-404.
for (const route of ['portal', 'admin', 'login', 'contact', 'services', 'about', 'join']) {
  const dir = path.join(dist, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(index, path.join(dir, 'index.html'));
}

console.log('Copied index.html → 404.html + portal/admin/login for SPA deep links');
