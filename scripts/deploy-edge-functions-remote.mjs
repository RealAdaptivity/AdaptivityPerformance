/**
 * Deploy packaged functions using Supabase Management API.
 * Auth: SUPABASE_ACCESS_TOKEN env var (Personal Access Token from supabase.com/dashboard/account/tokens)
 */
import fs from 'fs';
import path from 'path';

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: node scripts/deploy-edge-functions-remote.mjs <function-name> [...]');
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'supabase', '.edge-deploy');

for (const name of names) {
  const payloadPath = path.join(dir, `${name}.json`);
  if (!fs.existsSync(payloadPath)) {
    console.error(`Missing ${payloadPath}. Run: node scripts/package-edge-functions.mjs`);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const projectRef = payload.project_id;
  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(payload.name)}`;

  const body = {
    entrypoint_path: payload.entrypoint_path,
    verify_jwt: payload.verify_jwt,
    files: payload.files,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Deploy ${name} failed (${res.status}):`, text);
    process.exit(1);
  }
  console.log(`Deployed ${name}:`, text.slice(0, 200));
}
