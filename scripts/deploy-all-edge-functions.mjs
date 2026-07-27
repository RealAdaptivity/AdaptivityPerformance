/**
 * Deploy all packaged edge functions via Supabase MCP-style payload (Management API).
 * Uses SUPABASE_ACCESS_TOKEN from environment or .env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'supabase', '.edge-deploy');

function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(root, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = v;
    }
  } catch {
    /* */
  }
}

loadEnv();

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('NO_TOKEN');
  process.exit(2);
}

const names = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
let ok = 0;
let fail = 0;

for (const name of names.sort()) {
  const payload = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  const projectRef = payload.project_id;
  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(payload.name)}`;
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
    console.log(`FAIL ${name} ${res.status} ${text.slice(0, 120)}`);
    fail++;
  } else {
    console.log(`OK ${name}`);
    ok++;
  }
}

console.log(`DONE ok=${ok} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
