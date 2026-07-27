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
console.log('Copied index.html → 404.html for SPA deep links (GitHub Pages /admin)');
