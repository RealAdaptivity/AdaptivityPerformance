import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTS_PICKUP_LINE_TITLE,
  normalizeReference,
  paidOnInstant,
  paidViaText,
  receiptReferenceError,
  splitPickupLine,
  texasToday,
  withPickupLine,
} from '../src/services/receiptPayment.ts';

test('the receipt says how it was paid, with its reference', () => {
  assert.equal(paidViaText('cash', 'ignored'), 'Cash');
  assert.equal(paidViaText('card', '4242'), 'Card ending 4242');
  assert.equal(paidViaText('card', ''), 'Card');
  assert.equal(paidViaText('zelle', ' ABC123 '), 'Zelle · conf. ABC123');
  assert.equal(paidViaText('check', '#1042'), 'Check #1042');
  assert.equal(paidViaText('check', '1042'), 'Check #1042');
  assert.equal(paidViaText('other', 'Venmo @jane'), 'Venmo @jane');
  assert.equal(paidViaText('other', null), 'Other');
});

test('references are stored the way the receipts table accepts them', () => {
  // The table only takes 4 digits for a card.
  assert.equal(normalizeReference('card', 'Visa ending 4242'), '4242');
  assert.equal(normalizeReference('card', '4111 1111 1111 1234'), '1234');
  assert.equal(normalizeReference('cash', 'anything'), '');
  assert.equal(normalizeReference('zelle', 'x'.repeat(100)).length, 80);
});

test('Zelle needs its confirmation, Other needs a description, a card needs 4 digits if given', () => {
  assert.match(receiptReferenceError('zelle', '  ') ?? '', /Zelle confirmation/);
  assert.equal(receiptReferenceError('zelle', 'ABC123'), null);
  assert.match(receiptReferenceError('other', '') ?? '', /how they paid/);
  assert.equal(receiptReferenceError('card', ''), null);
  assert.match(receiptReferenceError('card', '42') ?? '', /last 4/);
  assert.equal(receiptReferenceError('card', '4242'), null);
  assert.equal(receiptReferenceError('cash', ''), null);
  assert.equal(receiptReferenceError('check', ''), null);
});

test('the parts pickup fee is stored with the parts and comes back on its own', () => {
  const lines = [
    { title: 'Front brakes', labor_cents: 22500, parts_cents: 18000, hours: 1.5 },
    { title: 'Diagnostic', labor_cents: 12000, parts_cents: 0 },
  ];
  const stored = withPickupLine(lines, 1800);
  assert.equal(stored.length, 3);
  assert.deepEqual(stored[2], { title: PARTS_PICKUP_LINE_TITLE, labor_cents: 0, parts_cents: 1800, fee: 'parts_pickup' });
  // labor + parts (with the pickup) is what the table's total check adds up.
  assert.equal(stored.reduce((s, l) => s + l.parts_cents, 0), 18000 + 1800);

  const back = splitPickupLine(JSON.parse(JSON.stringify(stored)));
  assert.equal(back.partsPickupCents, 1800);
  assert.deepEqual(back.lines, lines);

  assert.equal(withPickupLine(lines, 0).length, 2, 'no pickup line when there is no fee');
  assert.equal(withPickupLine(stored, 900).filter((l) => l.fee).length, 1, 'never two pickup lines');
  assert.deepEqual(splitPickupLine(null), { lines: [], partsPickupCents: 0 });
});

test('a paid-on date reads as that same day in Texas', () => {
  const iso = paidOnInstant('2026-10-13');
  for (const month of ['2026-01-05', '2026-07-05', '2026-10-13']) {
    assert.equal(
      new Date(paidOnInstant(month)).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
      month
    );
  }
  assert.equal(iso, '2026-10-13T17:00:00.000Z');
  // 11pm in Dallas is already the next day in UTC; the date is still Texas's.
  assert.equal(texasToday(new Date('2026-10-14T04:00:00Z')), '2026-10-13');
});
