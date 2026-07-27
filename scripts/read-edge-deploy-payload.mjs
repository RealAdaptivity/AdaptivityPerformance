import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'supabase', '.edge-deploy');
const name = process.argv[2];
if (!name) {
  console.error('Usage: node read-edge-deploy-payload.mjs <function-name>');
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
process.stdout.write(JSON.stringify(payload));
