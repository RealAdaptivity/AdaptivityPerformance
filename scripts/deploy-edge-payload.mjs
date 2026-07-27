/**
 * Deploy a packaged edge function via Supabase MCP-compatible payload.
 * Requires Supabase MCP deploy_edge_function to be invoked separately, OR
 * set SUPABASE_ACCESS_TOKEN and run with --curl (experimental).
 */
import fs from 'fs';
import path from 'path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node deploy-edge-payload.mjs <function-name>');
  process.exit(1);
}

const payloadPath = path.join(process.cwd(), 'supabase', '.edge-deploy', `${name}.json`);
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN (from supabase login / dashboard) to deploy.');
  console.error('Payload ready at:', payloadPath);
  process.exit(1);
}

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
  console.error('Deploy failed', res.status, text);
  process.exit(1);
}
console.log('Deployed', payload.name, text);
