import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOOKING_STEPS,
  COUNTED_STEPS,
  SERVICE_CHOICES,
  displayPhone,
  formatDayLong,
  splitTimeWindow,
  upcomingDays,
  validateContact,
  validateNeed,
  validateWhen,
  validateWhere,
  vinTail,
  visitCharges,
} from '../src/services/bookingFlow.ts';

test('five counted steps, then review', () => {
  assert.equal(COUNTED_STEPS, 5);
  assert.equal(BOOKING_STEPS.at(-1)?.id, 'review');
});

test('upcoming days start today in the local calendar and cross months', () => {
  // 2026-09-30 22:30 local: late evening must still be "today", not tomorrow in UTC.
  const days = upcomingDays(new Date(2026, 8, 30, 22, 30), 7);
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { iso: '2026-09-30', short: 'Today', dayOfMonth: 30, long: 'Wed, Sep 30' });
  assert.equal(days[1].short, 'Tmrw');
  assert.equal(days[1].iso, '2026-10-01');
  assert.equal(days[2].short, 'Fri');
  assert.equal(days[6].iso, '2026-10-06');
});

test('formatDayLong does not shift the day and rejects junk', () => {
  assert.equal(formatDayLong('2026-10-02'), 'Fri, Oct 2');
  assert.equal(formatDayLong('2026-02-31'), null);
  assert.equal(formatDayLong('tomorrow'), null);
});

test('time windows split for display without changing the stored value', () => {
  assert.deepEqual(splitTimeWindow('Morning (8 AM - 12 PM)'), { name: 'Morning', hours: '8 AM – 12 PM' });
  assert.deepEqual(splitTimeWindow('Emergency ASAP'), { name: 'Emergency ASAP', hours: 'Next available tech' });
});

test('every time window the form offers splits cleanly', () => {
  const src = readFileSync('src/services/scheduleWindows.ts', 'utf8');
  const block = src.match(/PREFERRED_TIME_WINDOWS = \[([\s\S]*?)\]/);
  assert.ok(block);
  for (const [, w] of block[1].matchAll(/'([^']+)'/g)) {
    const { name, hours } = splitTimeWindow(w);
    assert.ok(name && hours, w);
  }
});

test('a mobile visit adds the travel fee; a shop drop-off does not', () => {
  const fees = { diagnostic: 100, travel: 20 };
  assert.deepEqual(visitCharges('mobile', fees), { diagnostic: 100, travel: 20, dueAtVisit: 120 });
  assert.deepEqual(visitCharges('shop', fees), { diagnostic: 100, travel: 0, dueAtVisit: 100 });
});

test('the issue is required', () => {
  assert.ok(validateNeed({ issue: '   ' }).issue);
  assert.deepEqual(validateNeed({ issue: 'Grinding when braking' }), {});
});

test('a day in the past or a missing window is caught', () => {
  assert.deepEqual(validateWhen({ date: '2026-10-01', window: 'Morning (8 AM - 12 PM)' }, '2026-09-30'), {});
  assert.ok(validateWhen({ date: '2026-09-29', window: 'x' }, '2026-09-30').date);
  assert.ok(validateWhen({ date: '', window: '' }, '2026-09-30').window);
});

test('address needs a street, a city and a 5-digit ZIP', () => {
  assert.deepEqual(validateWhere({ street: '1 Main St', city: 'Justin', zip: '76247' }), {});
  assert.deepEqual(Object.keys(validateWhere({ street: '', city: '', zip: '7624' })).sort(), ['city', 'street', 'zip']);
});

test('contact reports everything at once, and consent is never assumed', () => {
  const errors = validateContact({ fullName: '', phone: '555', email: 'nope', agreed: false });
  assert.deepEqual(Object.keys(errors).sort(), ['agreed', 'email', 'fullName', 'phone']);
  assert.deepEqual(
    validateContact({ fullName: 'Jordan Reyes', phone: '+1 (940) 555-0123', email: 'j@x.com', agreed: true }),
    {}
  );
});

test('the consent box starts unchecked in the form', () => {
  const src = readFileSync('src/components/BookingModal.tsx', 'utf8');
  assert.doesNotMatch(src, /defaultChecked/);
  assert.match(src, /useState\(false\)[^\n]*\/\/ consent/);
});

test('quick-pick services exist in the catalog and are bookable', () => {
  const catalog = readFileSync('src/services/serviceCatalog.ts', 'utf8');
  const unavailable = catalog.match(/UNAVAILABLE_SERVICE_KINDS[^=]*= \[([\s\S]*?)\]/);
  assert.ok(unavailable);
  for (const { id } of SERVICE_CHOICES) {
    assert.match(catalog, new RegExp(`(id: '${id}'|'${id}',\\n)`), `${id} missing from catalog`);
    assert.doesNotMatch(unavailable[1], new RegExp(`'${id}'`), `${id} is not bookable`);
  }
});

test('vin tail', () => {
  assert.equal(vinTail('wba 8e9g5-0gnt84821'), '4821');
  assert.equal(vinTail('12'), '12');
});

test('phone numbers display the usual way, and anything odd is left alone', () => {
  assert.equal(displayPhone('9405550123'), '(940) 555-0123');
  assert.equal(displayPhone('+1 940.555.0123'), '(940) 555-0123');
  assert.equal(displayPhone(' 555-01 '), '555-01');
});

test('a phone booking may leave the email blank, but not a bad one', () => {
  const base = { fullName: 'Jordan Reyes', phone: '9405550123', agreed: true, emailOptional: true };
  assert.deepEqual(validateContact({ ...base, email: '' }), {});
  assert.ok(validateContact({ ...base, email: 'nope' }).email);
  assert.ok(validateContact({ ...base, email: '', emailOptional: false }).email);
});
