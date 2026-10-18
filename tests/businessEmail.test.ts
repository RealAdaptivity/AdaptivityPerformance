import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BUSINESS_EMAIL } from '../src/content/businessIdentity.ts';

/** Every address at our domain that the code mentions, with where. */
function addressesIn(dir: string, found: Map<string, string> = new Map()): Map<string, string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) addressesIn(path, found);
    else if (/\.(ts|tsx|html|json)$/.test(name)) {
      for (const m of readFileSync(path, 'utf8').matchAll(/[A-Za-z0-9._%+-]+@adaptivityperformance\.com/gi)) {
        found.set(m[0].toLowerCase(), path);
      }
    }
  }
  return found;
}

test('customers are only ever told one email address', () => {
  const found = addressesIn('src');
  for (const [address, path] of addressesIn('supabase/functions')) found.set(address, path);
  // receipts@ is the From address receipt emails are sent with, not one we tell anyone to write to.
  found.delete('receipts@adaptivityperformance.com');
  for (const [address, path] of found) {
    assert.equal(address, BUSINESS_EMAIL, `${path} mentions ${address}`);
  }
});
