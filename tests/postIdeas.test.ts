import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostIdea, townFromAddress } from '../src/services/postIdeas.ts';

test('the town comes from the address, never the street', () => {
  assert.equal(townFromAddress('1234 Canyon Falls Dr, Northlake, TX 76226'), 'Northlake');
  assert.equal(townFromAddress('100 Main St, Justin, TX 76247'), 'Justin');
  assert.equal(townFromAddress('somewhere'), null);
  assert.equal(townFromAddress(null), null);
});

test('a post idea names the town, service and vehicle, with the real price and no customer details', () => {
  const idea = buildPostIdea(
    { address: '9 Elm Ct, Northlake, TX 76226', service: 'Brake Service (Pads / Rotors)', vehicle: '2015 Ford Explorer Sport · 3.5L V6' },
    100
  );
  assert.equal(
    idea,
    'Another driveway job done in Northlake, TX: brake service (pads / rotors) on a 2015 Ford Explorer Sport. We come to you. Book a $100 mobile diagnostic at adaptivityperformance.com. #MobileMechanic #NorthlakeTX'
  );
  assert.ok(!/9 Elm/.test(idea));
  assert.ok(!/hold/i.test(idea));
});

test('missing pieces drop out cleanly', () => {
  const idea = buildPostIdea({ address: null, service: null, vehicle: 'Customer vehicle' }, 100);
  assert.equal(
    idea,
    'Another driveway job done: mobile repair. We come to you. Book a $100 mobile diagnostic at adaptivityperformance.com. #MobileMechanic #DFW'
  );
});
