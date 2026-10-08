import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  componentLabel,
  parseNhtsaDate,
  researchLinks,
  splitComponents,
  summarizeComplaints,
  summarizeRecalls,
} from '../src/services/vehicleResearch.ts';

/* Trimmed from real api.nhtsa.gov answers for a 2016 Ford F-150. */
const fx = JSON.parse(readFileSync('tests/fixtures/nhtsa-research.json', 'utf8'));

test('the edge function runs the same research code as the dashboard', () => {
  assert.equal(
    readFileSync('supabase/functions/_shared/vehicleResearch.ts', 'utf8'),
    readFileSync('src/services/vehicleResearch.ts', 'utf8')
  );
});

test('recall dates are day-first and complaint dates month-first', () => {
  assert.equal(parseNhtsaDate('18/12/2018', 'dmy'), '2018-12-18');
  assert.equal(parseNhtsaDate('08/04/2019', 'dmy'), '2019-04-08');
  assert.equal(parseNhtsaDate('10/05/2026', 'mdy'), '2026-10-05');
  assert.equal(parseNhtsaDate('31/02/2020', 'dmy'), null, 'not a real date');
  assert.equal(parseNhtsaDate('', 'mdy'), null);
  assert.equal(parseNhtsaDate(undefined, 'mdy'), null);
});

test('component names read like sentences, and a name with its own comma stays whole', () => {
  assert.equal(componentLabel('SEAT BELTS:REAR/OTHER'), 'Seat belts: rear/other');
  assert.deepEqual(splitComponents('POWER TRAIN,ENGINE'), ['Power train', 'Engine']);
  assert.deepEqual(splitComponents('SERVICE BRAKES, HYDRAULIC,POWER TRAIN'), [
    'Service brakes, hydraulic',
    'Power train',
  ]);
  assert.deepEqual(splitComponents(null), []);
});

test('recalls: one per campaign, fire and do-not-drive risks first, then newest', () => {
  const r = summarizeRecalls(fx.recalls);
  assert.deepEqual(
    r.map((x) => x.campaign),
    ['19V278000', '18V894000', '17V526000']
  );
  assert.equal(r[0].parkOutside, true);
  assert.equal(r[0].reportedOn, '2019-04-08');
  assert.equal(r[2].component, 'Seat belts: rear/other');
  assert.ok(!/\s{2}/.test(r[1].summary), 'runs of spaces collapsed');
  assert.deepEqual(summarizeRecalls(null), []);
  assert.deepEqual(summarizeRecalls({ results: 'nope' }), []);
});

test('complaints: totals, most-reported systems, newest first', () => {
  const c = summarizeComplaints(fx.complaints);
  assert.equal(c.total, 4);
  assert.equal(c.crashes, 1);
  assert.equal(c.injuries, 2);
  assert.deepEqual(c.byComponent[0], { component: 'Power train', count: 3 });
  assert.deepEqual(
    c.recent.map((x) => x.id),
    ['11769149', '11768800', '11768498', '11759088']
  );
  assert.equal(summarizeComplaints(fx.complaints, 2).recent.length, 2);
  assert.equal(summarizeComplaints(undefined).total, 0);
});

test('links: the VIN recall check only when there is a VIN, licensed tools always', () => {
  const withVin = researchLinks({ vin: '1FTEW1EG5GFA12345', year: '2016', make: 'Ford', model: 'F-150' });
  assert.equal(withVin[0].href, 'https://www.nhtsa.gov/recalls?vin=1FTEW1EG5GFA12345');
  assert.ok(withVin.some((l) => l.href === 'https://www.nhtsa.gov/vehicle/2016/FORD/F-150'));
  assert.ok(withVin.some((l) => /alldata/.test(l.href)));
  assert.ok(withVin.some((l) => /prodemand/.test(l.href)));
  const noVin = researchLinks({ year: '2016', make: 'Land Rover', model: 'Range Rover Sport' });
  assert.ok(!noVin.some((l) => /recalls\?vin/.test(l.href)));
  assert.ok(noVin.some((l) => l.href === 'https://www.nhtsa.gov/vehicle/2016/LAND%20ROVER/RANGE%20ROVER%20SPORT'));
});
