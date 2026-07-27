import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/deploy-payload-file.mjs <function-name>');
  process.exit(1);
}

try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  /* */
}

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const payload = JSON.parse(
  fs.readFileSync(path.join(root, 'supabase', '.edge-deploy', `${name}.json`), 'utf8')
);

const url = `https://api.supabase.com/v1/projects/${payload.project_id}/functions/deploy?slug=${encodeURIComponent(payload.name)}`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    entrypoint_path: payload.entrypoint_path,
    verify_jwt: payload.verify_jwt,
    files: payload.files,
  }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`FAIL ${res.status}`, text);
  process.exit(1);
}
console.log(`OK ${name}`, text.slice(0, 300));
