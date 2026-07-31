/**
 * Deploy one packaged function via Supabase Management API (multipart).
 * Requires SUPABASE_ACCESS_TOKEN in env or .env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/deploy-one-edge-function.mjs <function-name>');
  process.exit(1);
}

function loadEnv() {
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
}

loadEnv();
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(2);
}

const payloadPath = path.join(root, 'supabase', '.edge-deploy', `${name}.json`);
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const url = `https://api.supabase.com/v1/projects/${payload.project_id}/functions/deploy?slug=${encodeURIComponent(payload.name)}`;

const form = new FormData();
form.append(
  'metadata',
  JSON.stringify({
    name: payload.name,
    entrypoint_path: payload.entrypoint_path || 'index.ts',
    verify_jwt: payload.verify_jwt !== false,
  })
);

for (const file of payload.files || []) {
  const blob = new Blob([file.content], { type: 'application/typescript' });
  form.append('file', blob, file.name);
}

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const text = await res.text();
if (!res.ok) {
  console.error(`FAIL ${res.status}`, text);
  process.exit(1);
}
console.log(`OK ${name}`, text.slice(0, 300));
