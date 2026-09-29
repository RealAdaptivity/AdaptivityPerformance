import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkHeroCoverage,
  featuredServices,
  heroPrefill,
  servicePriceLabel,
  townsForDisplay,
  type CoverageLookup,
} from '../src/site/homeContent.ts';

const seo = JSON.parse(new TextDecoder().decode(readFileSync('src/site/localSeoData.json')));

/** The same rule lookupServiceZip applies: when two towns share a ZIP, the
 *  closer one wins, because that is the drive we would actually quote. */
function realLookup(): CoverageLookup {
  const byZip = new Map<string, { city: string; distanceMiles: number }>();
  for (const c of seo.cities) {
    for (const z of c.zips ?? []) {
      const prev = byZip.get(String(z));
      if (!prev || c.distanceMiles < prev.distanceMiles) {
        byZip.set(String(z), { city: c.city, distanceMiles: c.distanceMiles });
      }
    }
  }
  return (zip) => byZip.get(zip) ?? null;
}

const lookup = realLookup();

test('the hub ZIP is covered and names Justin', () => {
  const r = checkHeroCoverage(String(seo.hub.zip), lookup);
  assert.equal(r.kind, 'covered');
  assert.equal(r.kind === 'covered' && r.city, 'Justin');
});

test('a Dallas ZIP is outside, not invalid', () => {
  assert.deepEqual(checkHeroCoverage('75201', lookup), { kind: 'outside', zip: '75201' });
});

test('ZIP+4 and stray spaces still find the ZIP', () => {
  for (const input of ['76247-1234', '762471234', '  76247 ']) {
    const r = checkHeroCoverage(input, lookup);
    assert.equal(r.kind, 'covered', input);
    assert.equal(r.kind === 'covered' && r.zip, '76247', input);
  }
});

test('a typo is invalid rather than "we do not reach you"', () => {
  // Telling someone we don't cover them because they fat-fingered a digit
  // loses a booking we could have taken.
  for (const input of ['7624', '762477', 'justin', '76 247', '76247-12']) {
    assert.deepEqual(checkHeroCoverage(input, lookup), { kind: 'invalid' }, input);
  }
});

test('nothing typed is its own state, not an error', () => {
  assert.deepEqual(checkHeroCoverage('', lookup), { kind: 'empty' });
  assert.deepEqual(checkHeroCoverage('   ', lookup), { kind: 'empty' });
});

test('every ZIP in the town data is covered', () => {
  for (const c of seo.cities) {
    for (const z of c.zips ?? []) {
      assert.equal(checkHeroCoverage(String(z), lookup).kind, 'covered', `${c.city} ${z}`);
    }
  }
});

test('prefill leaves out empty fields so it never blanks the form', () => {
  assert.deepEqual(heroPrefill({ zip: '76247', vehicle: '  ', issue: '' }), { zipCode: '76247' });
  assert.deepEqual(
    heroPrefill({ zip: '76247', vehicle: ' 2018 Ram 1500 ', issue: ' Grinding when I brake ' }),
    { zipCode: '76247', vehicle: '2018 Ram 1500', issueDescription: 'Grinding when I brake' }
  );
  assert.deepEqual(heroPrefill({ zip: '', vehicle: '', issue: '' }), {});
});

test('towns are nearest first and the remainder adds up', () => {
  const { towns, remaining, total } = townsForDisplay(seo.cities, 28);
  assert.equal(total, seo.cities.length);
  assert.equal(towns.length + remaining, total);
  assert.equal(towns[0].city, 'Justin');
  for (let i = 1; i < towns.length; i++) {
    assert.ok(towns[i - 1].distanceMiles <= towns[i].distanceMiles, `${towns[i - 1].city} before ${towns[i].city}`);
  }
});

test('asking for more towns than exist shows them all and leaves none', () => {
  const r = townsForDisplay(seo.cities, 999);
  assert.equal(r.towns.length, seo.cities.length);
  assert.equal(r.remaining, 0);
  assert.equal(townsForDisplay(seo.cities, -3).towns.length, 0);
});

test('only the diagnostic reads as an exact price', () => {
  assert.equal(servicePriceLabel({ kind: 'diagnostic', price: 100 }), '$100');
  assert.equal(servicePriceLabel({ kind: 'brakes', price: 100 }), 'From $100');
});

test('featured services keep their order and skip anything not bookable', () => {
  const bookable = [{ id: 'oil_change' }, { id: 'diagnostic' }, { id: 'brakes' }];
  assert.deepEqual(
    featuredServices(bookable, ['diagnostic', 'brakes', 'retired_thing', 'oil_change']).map((s) => s.id),
    ['diagnostic', 'brakes', 'oil_change']
  );
  assert.deepEqual(featuredServices(bookable, []), []);
});
