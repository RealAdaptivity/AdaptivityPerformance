import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COVERED_ZIPS,
  assertServiceArea,
  isCoveredZip,
  normalizeZip,
  resolveServiceZip,
} from '../supabase/functions/_shared/serviceArea.ts';

const seo = JSON.parse(new TextDecoder().decode(readFileSync('src/site/localSeoData.json')));

function zipsFromSeoData(): string[] {
  const zips = new Set<string>();
  for (const city of seo.cities || []) {
    for (const z of city.zips || []) zips.add(String(z));
    if (city.zip) zips.add(String(city.zip));
  }
  if (seo.hub?.zip) zips.add(String(seo.hub.zip));
  return [...zips].sort();
}

test('the edge allow-list matches the coverage data the site is built from', () => {
  // These two drifting is what let the server accept bookings the site never
  // advertised. If this fails, run: node scripts/sync-service-catalog.mjs
  assert.deepEqual([...COVERED_ZIPS], zipsFromSeoData());
});

test('every ZIP the site advertises is accepted by the server', () => {
  // The direction that breaks real bookings: a customer sees their town listed,
  // books, and the edge function refuses them.
  for (const zip of zipsFromSeoData()) {
    assert.ok(isCoveredZip(zip), `site advertises ${zip} but the server rejects it`);
  }
});

test('Dallas is not served', () => {
  // The old edge copy prefix-matched 750/751/752/760/761/762, so all of 751xx
  // and 752xx — Dallas — were accepted for mobile dispatch, which is roughly
  // twice the radius this business will drive.
  for (const zip of ['75201', '75202', '75204', '75219', '75240', '75001', '75101']) {
    assert.equal(isCoveredZip(zip), false, `${zip} should not be dispatchable`);
    assert.throws(() => assertServiceArea(zip, 'mobile'), /not available in zip/);
  }
});

test('a covered ZIP passes the mobile gate', () => {
  assert.equal(isCoveredZip('76247'), true); // Justin — the hub
  assertServiceArea('76247', 'mobile');
});

test('shop bookings skip the area check entirely', () => {
  // Customer drives to Justin, so where they live is irrelevant.
  assertServiceArea('75201', 'shop');
  assertServiceArea(null, 'shop');
  assertServiceArea('not a zip', 'shop');
});

test('mobile bookings require a real zip', () => {
  assert.throws(() => assertServiceArea(null, 'mobile'), /valid 5-digit service zip/);
  assert.throws(() => assertServiceArea('', 'mobile'), /valid 5-digit service zip/);
  assert.throws(() => assertServiceArea('abc', 'mobile'), /valid 5-digit service zip/);
});

test('normalizeZip pulls a zip out of a full address line', () => {
  assert.equal(normalizeZip('123 Main St, Justin, TX 76247'), '76247');
  assert.equal(normalizeZip('76247'), '76247');
  assert.equal(normalizeZip('  76247  '), '76247');
  assert.equal(normalizeZip('TX'), null);
  assert.equal(normalizeZip(null), null);
});

test('resolveServiceZip prefers the explicit field over the address', () => {
  assert.equal(resolveServiceZip('76247', '123 Main St, Dallas, TX 75201'), '76247');
  assert.equal(resolveServiceZip(null, '123 Main St, Justin, TX 76247'), '76247');
  assert.equal(resolveServiceZip(null, null), null);
});
