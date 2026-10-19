import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findRepeatBooking,
  phoneKey,
  textKey,
  type EarlierBooking,
} from '../supabase/functions/_shared/repeatBooking.ts';

const NOW = new Date('2026-09-18T02:53:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const earlier = (over: Partial<EarlierBooking> = {}): EarlierBooking => ({
  id: 'b1',
  reference_code: 'AP-6668',
  customer_name: 'Arsenio Washington',
  customer_phone: '(817) 555-9316',
  vehicle_description: '2015 Ford explorer',
  status: 'UNASSIGNED',
  created_at: minutesAgo(4),
  ...over,
});

const incoming = { name: 'Arsenio Washington', phone: '817-555-9316', vehicle: '2015 Ford Explorer' };

test('phone numbers match however they are typed', () => {
  assert.equal(phoneKey('(817) 555-9316'), '8175559316');
  assert.equal(phoneKey('+1 817 555 9316'), '8175559316');
  assert.equal(phoneKey('817.555.9316'), '8175559316');
  assert.equal(phoneKey('555-9316'), null, 'not a full number');
  assert.equal(phoneKey(null), null);
});

test('names and vehicles ignore case and spacing', () => {
  assert.equal(textKey('2015 Ford explorer'), textKey('2015  Ford Explorer'));
  assert.equal(textKey('Thomas Ham'), textKey(' thomas ham '));
  assert.equal(textKey('2003 Ford Thunderbird Bond · 3.9L V8'), '2003 ford thunderbird bond 3 9l v8');
});

test('the same customer booking the same vehicle again gets the first booking back', () => {
  // The Explorer booked three times in four minutes on 9/17.
  const found = findRepeatBooking(incoming, [earlier()], NOW);
  assert.equal(found?.reference_code, 'AP-6668');
});

test('the newest open booking is the one handed back', () => {
  const found = findRepeatBooking(
    incoming,
    [earlier({ id: 'a', reference_code: 'AP-6668', created_at: minutesAgo(5) }), earlier({ id: 'b', reference_code: 'AP-1618', created_at: minutesAgo(1) })],
    NOW
  );
  assert.equal(found?.reference_code, 'AP-1618');
});

test('a second vehicle on the same phone is a new booking', () => {
  assert.equal(findRepeatBooking({ ...incoming, vehicle: '2021 Ford F-150 XLT' }, [earlier()], NOW), null);
});

test('someone who only knows the phone and the car does not get the confirmation number', () => {
  assert.equal(findRepeatBooking({ ...incoming, name: 'Someone Else' }, [earlier()], NOW), null);
});

test('an hour later it is a new booking', () => {
  assert.equal(findRepeatBooking(incoming, [earlier({ created_at: minutesAgo(61) })], NOW), null);
  assert.ok(findRepeatBooking(incoming, [earlier({ created_at: minutesAgo(59) })], NOW));
});

test('a canceled or finished booking is not reused', () => {
  assert.equal(findRepeatBooking(incoming, [earlier({ status: 'CANCELED' })], NOW), null);
  assert.equal(findRepeatBooking(incoming, [earlier({ status: 'COMPLETED' })], NOW), null);
  assert.ok(findRepeatBooking(incoming, [earlier({ status: 'EN_ROUTE' })], NOW));
});

test('nothing matches without a full phone number, a name or a vehicle', () => {
  assert.equal(findRepeatBooking({ ...incoming, phone: '9316' }, [earlier({ customer_phone: '9316' })], NOW), null);
  assert.equal(findRepeatBooking({ ...incoming, name: ' ' }, [earlier({ customer_name: ' ' })], NOW), null);
  assert.equal(findRepeatBooking({ ...incoming, vehicle: '' }, [earlier({ vehicle_description: '' })], NOW), null);
});
