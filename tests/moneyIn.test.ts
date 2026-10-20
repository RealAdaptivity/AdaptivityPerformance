import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupReceiptsByMethod, summarizeMoneyIn, texasDateDaysAgo } from '../src/services/moneyIn.ts';

test('receipts are grouped by how they were paid, unknown methods as other', () => {
  const g = groupReceiptsByMethod([
    { payment_method: 'cash', total_cents: 12000 },
    { payment_method: 'zelle', total_cents: 43934 },
    { payment_method: 'cash', total_cents: 5000 },
    { payment_method: 'venmo', total_cents: 1000 },
    { payment_method: 'check', total_cents: null },
  ]);
  assert.deepEqual(g.rows, [
    { method: 'cash', count: 2, cents: 17000 },
    { method: 'zelle', count: 1, cents: 43934 },
    { method: 'check', count: 1, cents: 0 },
    { method: 'other', count: 1, cents: 1000 },
  ]);
  assert.equal(g.totalCents, 61934);
});

test('money in adds walk-in receipts to jobs and takes off refunds; kept is after tech pay', () => {
  const m = summarizeMoneyIn({ totalCents: 100000, refundedCents: 5000, techPayoutCents: 60000 }, { totalCents: 20000 });
  assert.deepEqual(m, {
    jobsCents: 100000,
    receiptsCents: 20000,
    refundedCents: 5000,
    totalInCents: 115000,
    techPayoutCents: 60000,
    keptCents: 55000,
  });
});

test('missing data counts as nothing rather than failing', () => {
  assert.equal(summarizeMoneyIn(null, null).totalInCents, 0);
  assert.equal(summarizeMoneyIn(null, { totalCents: 3000 }).keptCents, 3000);
});

test('the receipts window uses Texas dates', () => {
  // 01:00 UTC on Oct 20 is still Oct 19 in Texas.
  assert.equal(texasDateDaysAgo(0, new Date('2026-10-20T01:00:00Z')), '2026-10-19');
  assert.equal(texasDateDaysAgo(30, new Date('2026-10-20T18:00:00Z')), '2026-09-20');
});
