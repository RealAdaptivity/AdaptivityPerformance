import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseWorkOrder, workOrderCloseOutInput } from '../src/services/workOrder.ts';
import { computeCloseOut } from '../src/services/closeOut.ts';

test('a work order keeps titled or priced lines and drops empty ones', () => {
  const order = parseWorkOrder({
    lines: [
      { title: '  Spark plugs (6) ', parts: '$84.00', labor: '120' },
      { title: '', parts: '', labor: '' },
      { title: '', parts: '15.5', labor: '' },
      { title: 'Ignition coil', parts: 'abc', labor: -5 },
    ],
    partsPickup: true,
  });
  assert.deepEqual(order, {
    lines: [
      { title: 'Spark plugs (6)', partsCents: 8400, laborCents: 12000 },
      { title: 'Parts', partsCents: 1550, laborCents: 0 },
      { title: 'Ignition coil', partsCents: 0, laborCents: 0 },
    ],
    partsPickup: true,
  });
});

test('nothing to do is no work order, and the pickup fee is off unless asked', () => {
  assert.equal(parseWorkOrder(null), null);
  assert.equal(parseWorkOrder({ lines: [{ title: ' ', parts: '', labor: '' }] }), null);
  assert.equal(parseWorkOrder({ lines: [{ title: 'Oil change', labor: '40' }], partsPickup: 'yes' })?.partsPickup, false);
});

test('saved lines in cents read back the same', () => {
  const order = parseWorkOrder({ lines: [{ title: 'Spark plugs', partsCents: 8400, laborCents: 12000 }], partsPickup: true });
  assert.deepEqual(order?.lines, [{ title: 'Spark plugs', partsCents: 8400, laborCents: 12000 }]);
});

test('the estimate is the close-out sum: diagnostic, travel, pickup on parts, tech payout', () => {
  const order = parseWorkOrder({ lines: [{ title: 'Spark plugs', parts: '84', labor: '120' }], partsPickup: true })!;
  const c = computeCloseOut(workOrderCloseOutInput(order, { diagnosticCents: 10000, travelCents: 2000 }));
  assert.equal(c.partsPickupCents, 840);
  // Tax on parts + pickup: 9240 * 8.25% = 762.3 → 762.
  assert.equal(c.taxCents, 762);
  assert.equal(c.totalCents, 10000 + 2000 + 12000 + 8400 + 840 + 762);
  // 70% of diagnostic + labor, plus travel, pickup and the parts the tech bought.
  assert.equal(c.techPayoutCents, Math.floor(((10000 + 12000) * 70 + 50) / 100) + 2000 + 840 + 8400);
});

test('the booking edge function reads work orders with the same code as the site', () => {
  assert.equal(
    readFileSync('supabase/functions/_shared/workOrder.ts', 'utf8'),
    readFileSync('src/services/workOrder.ts', 'utf8')
  );
});
